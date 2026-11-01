import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { remittanceAmount } from '@/lib/remittances/validation';
import { publicAgency,reply,failure,databaseFailure,RemittanceError } from '@/lib/remittances/server';
export async function GET(request:NextRequest){
 try{
  const store=await publicAgency(request,request.nextUrl.searchParams.get('slug'));
  let amount:number;try{amount=remittanceAmount(request.nextUrl.searchParams.get('amount'));}catch(e){throw new RemittanceError((e as Error).message);}
  const {data,error}=await supabaseAdmin.rpc('quote_remittance_checkout',{p_store_id:store.id,p_amount:amount});
  if(error)databaseFailure(error);
  return reply({quote:data,agency:{name:store.name,slug:store.slug}});
 }catch(error){return failure(error);}
}
