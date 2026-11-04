import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin as db } from '@/lib/supabase-admin';
import { assigned, checkOrigin, fail, PortalError, session, shipmentFields } from '@/lib/delivery/server';
import { assignmentFilter, operationPatch, validVersion, ownedEvidencePath } from '@/lib/delivery/policy';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
export async function GET(req:NextRequest) {
  try {
    const {scope}=await session(req);
    const url=new URL(req.url);
    const page=Math.max(0,Math.min(100000,Math.floor(Number(url.searchParams.get('page'))||0)));
    const {data,error}=await assigned(scope).order('id').range(page*50,page*50+50);
    if(error) throw error;
    const rows=await Promise.all((data||[]).slice(0,50).map(async row=>{
      let photoUrl:string|null=null;
      // Only issue a short-lived URL after checking the parent shipment assignment.
      if(row.delivery_photo_url && ownedEvidencePath(row.delivery_photo_url,scope,row.id,row.tracking_code)) {
        const {data}=await db.storage.from('delivery-photos').createSignedUrl(row.delivery_photo_url,600);
        photoUrl=data?.signedUrl||null;
      }
      return {...row,delivery_photo_url:undefined,assigned_staff_id:undefined,assigned_driver_id:undefined,photoUrl};
    }));
    return Response.json({rows,hasMore:(data?.length||0)>50},{headers});
  }catch(e){return fail(e);}
}
export async function POST(req:NextRequest) {
  let uploaded:string|null=null;
  try {
    checkOrigin(req);
    const {scope}=await session(req);
    if(Number(req.headers.get('content-length'))>8500000) throw new PortalError('La foto es demasiado grande.',413);
    const form=await req.formData();
    const id=String(form.get('id')||'');
    const version=form.get('version');
    const action=String(form.get('action')||'');
    if(!/^[a-z0-9_-]{1,100}$/i.test(id)||!validVersion(version)) throw new PortalError('Actualiza el listado antes de guardar.');
    let patch:Record<string,unknown>;
    try { patch=operationPatch(action,new Date().toISOString()); } catch {throw new PortalError('Estado no válido.');}
    const {data:current,error}=await assigned(scope).eq('id',id).maybeSingle();
    if(error) throw error;
    if(!current) throw new PortalError('El envío ya no está asignado a tu cuenta.',404);
    if(new Date(current.updated_at).getTime()!==new Date(version).getTime()) throw new PortalError('El envío cambió. Actualiza el listado antes de continuar.',409);
    if(current.status==='cancelled') throw new PortalError('Este envío está cancelado.',409);
    // Completed shipments can receive evidence, but are never reopened by a driver.
    if(current.delivered && action!=='photo') throw new PortalError('El envío ya está entregado. Solo puedes adjuntar la evidencia.',409);
    const file=form.get('photo');
    if(file instanceof File && file.size) {
      if(file.size>8000000) throw new PortalError('La foto supera 8 MB. Selecciona una imagen más pequeña.',413);
      let bytes:Buffer;
      try {
        bytes=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:40000000}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).jpeg({quality:75}).toBuffer();
      }catch{throw new PortalError('No se pudo leer la imagen. Toma una foto o selecciona un archivo JPEG/PNG.');}
      if(bytes.length>8000000) throw new PortalError('La foto es demasiado grande.',413);
      uploaded=`${scope.storeId}/${id}/${randomUUID()}.jpg`;
      const {error:photoError}=await db.storage.from('delivery-photos').upload(uploaded,bytes,{contentType:'image/jpeg',upsert:false});
      if(photoError) throw photoError;
      patch.delivery_photo_url=uploaded;
    } else if(action==='photo') throw new PortalError('Selecciona una foto primero.');
    // Assignment, tenant, deletion and version guards must remain in the UPDATE,
    // not only in the preceding SELECT (reassignment and concurrent phone writes).
    const {data:saved,error:saveError}=await db.from('shipments').update(patch).eq('id',id).eq('store_id',scope.storeId).is('deleted_at',null).or(assignmentFilter(scope)).eq('updated_at',version).select(shipmentFields).maybeSingle();
    if(saveError) throw saveError;
    if(!saved) throw new PortalError('No se guardó: el envío cambió o fue reasignado. Actualiza y revisa su estado.',409);
    uploaded=null; // Committed; never remove a photo referenced by a saved delivery.
    return Response.json({ok:true,id:saved.id,status:saved.status,updated_at:saved.updated_at},{headers});
  }catch(e){
    if(uploaded) await db.storage.from('delivery-photos').remove([uploaded]);
    return fail(e);
  }
}
