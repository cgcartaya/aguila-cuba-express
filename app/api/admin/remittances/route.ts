import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UUID } from '@/lib/remittances/validation';
import { adminAccess,readBody,reply,failure,databaseFailure,RemittanceError } from '@/lib/remittances/server';
export async function GET(request:NextRequest){
 try{
  const storeId=request.nextUrl.searchParams.get('storeId')??'';
  if(!UUID.test(storeId))throw new RemittanceError('Tienda inválida.');
  await adminAccess(request,storeId);
  const page=Number(request.nextUrl.searchParams.get('page')??0);
  const status=request.nextUrl.searchParams.get('status')??'pending';
  if(!Number.isInteger(page)||page<0||page>10000||!['pending','paid','cancelled'].includes(status))throw new RemittanceError('Filtro inválido.');
  const {data,error}=await supabaseAdmin.from('remittance_orders').select('id,payload,amount,commission,total,status,shipment_id,payment_reference,created_at').eq('store_id',storeId).eq('status',status).order('created_at',{ascending:false}).range(page*50,page*50+49);
  if(error)throw new RemittanceError('No se pudieron cargar los pedidos.',503);
  return reply({orders:data});
 }catch(error){return failure(error);}
}
export async function POST(request:NextRequest){
 try{
  const body=await readBody(request);const storeId=String(body.storeId??'');const id=String(body.id??'');
  if(!UUID.test(storeId)||!UUID.test(id))throw new RemittanceError('Pedido inválido.');
  const actor=await adminAccess(request,storeId,true);
  if(body.action==='confirm'){
   const reference=typeof body.payment_reference==='string'?body.payment_reference.trim():'';
   if(reference.length<3||reference.length>120)throw new RemittanceError('Indica la referencia del pago recibido.');
   const {data,error}=await supabaseAdmin.rpc('confirm_remittance_checkout',{p_store_id:storeId,p_order_id:id,p_actor:actor,p_payment_reference:reference});
   if(error)databaseFailure(error);
   return reply({shipmentId:data.shipment_id});
  }
  if(body.action==='cancel'){
   const {data,error}=await supabaseAdmin.from('remittance_orders').update({status:'cancelled'}).eq('id',id).eq('store_id',storeId).eq('status','pending').select('id').maybeSingle();
   if(error)throw new RemittanceError('No se pudo cancelar el pedido.',503);
   if(!data)throw new RemittanceError('El pedido ya no está pendiente.',409);
   return reply({ok:true});
  }
  throw new RemittanceError('Acción inválida.');
 }catch(error){return failure(error);}
}
