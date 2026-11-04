import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCloverSettings } from "@/lib/services/clover-admin";
import { verifyCloverSignature } from "@/lib/payments/clover-signature";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{storeId:string}>}) {
 const {storeId}=await params;
 try {
  const settings=await getCloverSettings(storeId);
  // Continue accepting authentic events even after Clover has been disabled.
  if(!settings?.webhook_secret) return NextResponse.json({error:"Not configured"},{status:404});
  const raw=await request.text();
  if(!verifyCloverSignature(raw,request.headers.get("clover-signature")||"",settings.webhook_secret)) return NextResponse.json({error:"Invalid signature"},{status:401});
  const event=JSON.parse(raw);
  if(event.merchantId!==settings.merchant_id) return NextResponse.json({error:"Merchant mismatch"},{status:400});
  if(event.type!=="PAYMENT"||event.status!=="APPROVED") return NextResponse.json({ok:true});
  if(typeof event.data!=="string"||typeof event.id!=="string") return NextResponse.json({error:"Invalid payment"},{status:400});
  const {data,error}=await supabaseAdmin.rpc("settle_clover_payment",{p_store_id:storeId,p_session_id:event.data,p_merchant_id:event.merchantId,p_payment_id:event.id});
  if(error) return NextResponse.json({error:"Payment could not be recorded"},{status:500});
  return NextResponse.json({ok:true,status:data});
 } catch {return NextResponse.json({error:"Webhook could not be processed"},{status:500});}
}
