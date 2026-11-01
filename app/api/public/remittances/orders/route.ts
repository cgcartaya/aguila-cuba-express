import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UUID,remittancePayload } from '@/lib/remittances/validation';
import { publicAgency,readBody,reply,failure,databaseFailure,RemittanceError } from '@/lib/remittances/server';
export async function POST(request:NextRequest){
 try{
  const body=await readBody(request);
  const store=await publicAgency(request,typeof body.slug==='string'?body.slug:null);
  if(typeof body.idempotency_key!=='string'||!UUID.test(body.idempotency_key))throw new RemittanceError('Solicitud inválida.');
  let payload;try{payload=remittancePayload(body);}catch(e){throw new RemittanceError((e as Error).message);}
  const expected=Number(body.expected_total);
  if(!Number.isFinite(expected)||expected<=0)throw new RemittanceError('Vuelve a cotizar la remesa.');
  const {data,error}=await supabaseAdmin.rpc('create_remittance_checkout',{p_store_id:store.id,p_key:body.idempotency_key,p_payload:payload,p_expected_total:expected});
  if(error)databaseFailure(error);
  const order=Array.isArray(data)?data[0]:data;
  if(!order?.id)throw new RemittanceError('No se pudo recuperar el pedido. Reintenta la misma solicitud.',503);
  return reply({order:{reference:order.id,status:order.status,amount:order.amount,commission:order.commission,total:order.total,currency:order.currency}},201);
 }catch(error){return failure(error);}
}
export async function GET(request:NextRequest){
 try{
  const store=await publicAgency(request,request.nextUrl.searchParams.get('slug'));
  const reference=request.nextUrl.searchParams.get('reference')??'';
  if(!UUID.test(reference))throw new RemittanceError('Referencia inválida.');
  const {data,error}=await supabaseAdmin.from('remittance_orders').select('id,status,amount,commission,total,currency,shipment_id').eq('id',reference).eq('store_id',store.id).maybeSingle();
  if(error)throw new RemittanceError('No se pudo consultar el pedido.',503);
  if(!data)throw new RemittanceError('Pedido no encontrado.',404);
  let trackingCode=null;
  if(data.status==='paid'&&data.shipment_id){const result=await supabaseAdmin.from('shipments').select('tracking_code').eq('id',data.shipment_id).eq('store_id',store.id).is('deleted_at',null).maybeSingle();trackingCode=result.data?.tracking_code??null;}
  return reply({order:{reference:data.id,status:data.status,amount:data.amount,commission:data.commission,total:data.total,currency:data.currency,trackingCode}});
 }catch(error){return failure(error);}
}
