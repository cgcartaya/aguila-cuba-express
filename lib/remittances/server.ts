import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hasShippingPermission } from '@/lib/shipping/permissions';
import type { StoreMembership } from '@/lib/admin/access';
export class RemittanceError extends Error {
  status:number;
  constructor(message:string,status=400){super(message);this.status=status;}
}
export const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
export function failure(error:unknown){return reply({error:error instanceof RemittanceError?error.message:'No se pudo completar la operación. Inténtalo de nuevo.'},error instanceof RemittanceError?error.status:500);}
export function databaseFailure(error:{message:string}){
  const allowed=['Importe inválido.','Agencia no disponible.','Tarifas no disponibles.','Datos incompletos o inválidos.','La solicitud cambió. Vuelve a intentarlo.','Las tarifas cambiaron. Revisa el total y confirma otra vez.','Demasiadas solicitudes. Contacta con la agencia.','Pedido no encontrado.','El pedido ya no está pendiente.','Indica la referencia del pago recibido.'];
  const message=allowed.find(text=>error.message.includes(text));
  throw new RemittanceError(message??'No se pudo completar la operación.',message?(message.startsWith('Las tarifas')?409:400):500);
}
export async function publicAgency(request:NextRequest,slug?:string|null){
  const host=(request.headers.get('host')??'').split(':')[0].toLowerCase().replace(/^www\./,'');
  let query=supabaseAdmin.from('stores').select('id,name,slug,subdomain').eq('subdomain','alvarez-travel').eq('is_active',true).eq('module_store_enabled',true).eq('module_shipping_enabled',true);
  if(host==='perlamarketplace.com'||host==='localhost'||host.endsWith('.vercel.app')){
    if(!slug)throw new RemittanceError('Agencia no encontrada.',404);
    query=query.eq('slug',slug);
  }else if(host.endsWith('.perlamarketplace.com'))query=query.eq('subdomain',host.slice(0,-'.perlamarketplace.com'.length));
  else query=query.eq('domain',host);
  const {data,error}=await query.maybeSingle();
  if(error)throw new RemittanceError('No se pudo consultar la agencia.',503);
  if(!data)throw new RemittanceError('Agencia no encontrada.',404);
  return data;
}
export async function readBody(request:NextRequest){
  const origin=request.headers.get('origin');
  if(origin){
    let host:string;try{host=new URL(origin).host;}catch{throw new RemittanceError('Origen no permitido.',403);}
    if(host!==request.headers.get('host'))throw new RemittanceError('Origen no permitido.',403);
  }
  const raw=await request.text();
  if(raw.length>8000)throw new RemittanceError('Solicitud demasiado grande.',413);
  try {const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value as Record<string,unknown>;}catch{throw new RemittanceError('Solicitud inválida.');}
}
export async function adminAccess(request:NextRequest,storeId:string,write=false){
  const token=(request.headers.get('authorization')??'').replace(/^Bearer\s+/i,'').trim();
  if(!token)throw new RemittanceError('Inicia sesión.',401);
  const {data:{user}}=await supabaseAdmin.auth.getUser(token);
  if(!user)throw new RemittanceError('Sesión inválida.',401);
  const {data:profile}=await supabaseAdmin.from('profiles').select('role,active').eq('id',user.id).maybeSingle();
  if(!profile?.active)throw new RemittanceError('Usuario inactivo.',403);
  if(profile.role!=='super_admin'){
    const {data:membership}=await supabaseAdmin.from('store_users').select('*').eq('store_id',storeId).eq('user_id',user.id).eq('active',true).maybeSingle();
    if(!hasShippingPermission(membership as StoreMembership|null,write?'shipping.billing':'shipping.view'))throw new RemittanceError('No tienes permiso para esta operación.',403);
  }
  const {data:store}=await supabaseAdmin.from('stores').select('id').eq('id',storeId).eq('subdomain','alvarez-travel').eq('is_active',true).eq('module_shipping_enabled',true).maybeSingle();
  if(!store)throw new RemittanceError('Agencia no disponible.',404);
  return user.id;
}
