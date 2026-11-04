import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCloverSettings } from "@/lib/services/clover-admin";
import { verifyCloverSignature } from "@/lib/payments/clover-signature";
export const runtime="nodejs";
// Dashboard reachability checks never settle payments or return configuration.
export async function GET() {
 return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
}
export async function POST(request:NextRequest,{params}:{params:Promise<{storeId:string}>}) {
 const {storeId}=await params;
 try {
  const raw=await request.text();
  const signature=request.headers.get("clover-signature")||"";
  let event:Record<string,unknown>;
  try {event=JSON.parse(raw||"{}");} catch {return NextResponse.json({error:"Invalid JSON"},{status:400});}
  if(!event||typeof event!=="object"||Array.isArray(event))return NextResponse.json({error:"Invalid event"},{status:400});
  // A probe can be unsigned, but must contain NO payment/event fields.
  // This is only an acknowledgement and never reaches the settlement RPC.
  const keys=Object.keys(event);
  if(!signature&&(keys.length===0||(keys.length===1&&keys[0]==="verificationCode"&&typeof event.verificationCode==="string"&&event.verificationCode.length<=200))) {
   console.info("Clover webhook",{storeId,outcome:"reachability_probe"});
   return NextResponse.json({ok:true,...(event.verificationCode?{verificationCode:event.verificationCode}:{})});
  }
  const settings=await getCloverSettings(storeId);
  // Continue accepting authentic events even after Clover has been disabled.
  if(!settings?.webhook_secret) return NextResponse.json({error:"Not configured"},{status:404});
  if(!verifyCloverSignature(raw,signature,settings.webhook_secret)) {
   console.warn("Clover webhook",{storeId,outcome:"invalid_signature",hasSignature:Boolean(signature),keys:keys.slice(0,15)});
   return NextResponse.json({error:"Invalid signature"},{status:401});
  }
  // Clover Dashboard TEST URL sends a signed {test: ...} probe, not a payment.
  // Signature is verified above; acknowledge only the isolated test envelope.
  if(keys.length===1&&keys[0]==="test") {
   console.info("Clover webhook",{storeId,outcome:"signed_test_probe"});
   return NextResponse.json({ok:true});
  }
  console.info("Clover webhook",{storeId,outcome:"verified_event",type:typeof event.type==="string"?event.type.slice(0,40):null,status:typeof event.status==="string"?event.status.slice(0,40):null,keys:keys.slice(0,15)});
  if(event.merchantId!==settings.merchant_id) {
   console.warn("Clover webhook",{storeId,outcome:"merchant_mismatch",keys:keys.slice(0,15)});
   return NextResponse.json({error:"Merchant mismatch"},{status:400});
  }
  if(event.type!=="PAYMENT"||event.status!=="APPROVED") return NextResponse.json({ok:true});
  if(typeof event.data!=="string"||typeof event.id!=="string") return NextResponse.json({error:"Invalid payment"},{status:400});
  const {data,error}=await supabaseAdmin.rpc("settle_clover_payment",{p_store_id:storeId,p_session_id:event.data,p_merchant_id:event.merchantId,p_payment_id:event.id});
  if(error) {
   console.error("Clover webhook",{storeId,outcome:"settlement_failed",code:error.code});
   return NextResponse.json({error:"Payment could not be recorded"},{status:500});
  }
  console.info("Clover webhook",{storeId,outcome:"settled",status:data});
  return NextResponse.json({ok:true,status:data});
 } catch {console.error("Clover webhook",{storeId,outcome:"processing_failed"});return NextResponse.json({error:"Webhook could not be processed"},{status:500});}
}
