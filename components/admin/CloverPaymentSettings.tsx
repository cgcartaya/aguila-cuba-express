"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CloverPaymentSettings({storeId}:{storeId:string}) {
 const [merchantId,setMerchantId]=useState("");
 const [privateToken,setPrivateToken]=useState("");
 const [webhookSecret,setWebhookSecret]=useState("");
 const [environment,setEnvironment]=useState("production");
 const [enabled,setEnabled]=useState(false);
 const [configured,setConfigured]=useState(false);
 const [busy,setBusy]=useState(true);
 const [message,setMessage]=useState("");
 const [reviews,setReviews]=useState<Array<{id:string;target_type:string;target_id:string;total_cents:number;payment_id:string}>>([]);
 const [origin,setOrigin]=useState("");
 useEffect(()=>{
  let cancelled=false;
  setPrivateToken("");setWebhookSecret("");setMessage("");setBusy(true);setOrigin(window.location.origin);
  void (async()=>{
   try {
    const {data}=await supabase.auth.getSession();
    const response=await fetch(`/api/admin/shipping-settings/clover?store_id=${encodeURIComponent(storeId)}`,{headers:{Authorization:`Bearer ${data.session?.access_token||""}`},cache:"no-store"});
    const body=await response.json();
    if(cancelled) return;
    if(!response.ok) throw new Error(body.error||"No se pudo consultar Clover.");
    setMerchantId(body.merchantId);setEnvironment(body.environment);setEnabled(body.enabled);setConfigured(body.configured);setReviews(body.reviews||[]);
   }catch(error){if(!cancelled)setMessage(error instanceof Error?error.message:"No se pudo consultar Clover.");}
   finally{if(!cancelled)setBusy(false);}
  })();
  return ()=>{cancelled=true;};
 },[storeId]);
 async function save(){
  setBusy(true);setMessage("");
  try {
   const {data}=await supabase.auth.getSession();
   const response=await fetch("/api/admin/shipping-settings/clover",{method:"POST",headers:{Authorization:`Bearer ${data.session?.access_token||""}`,"Content-Type":"application/json"},body:JSON.stringify({store_id:storeId,merchantId,privateToken,webhookSecret,environment,enabled})});
   const body=await response.json();if(!response.ok)throw new Error(body.error||"No se pudo guardar.");
   setPrivateToken("");setWebhookSecret("");setConfigured(true);setMessage("Configuración guardada.");
  }catch(error){setMessage(error instanceof Error?error.message:"No se pudo guardar Clover.");}
  finally{setBusy(false);}
 }
 const input="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm";
 return <section className="mt-6 rounded-2xl border border-emerald-200 bg-white p-6" aria-labelledby="clover-title">
  <h2 id="clover-title" className="font-black text-[#061b3a]">Clover Hosted Checkout</h2>
  <p className="mt-1 text-sm text-slate-500">Cobra pedidos y envíos en la cuenta Clover de esta tienda. Al activarlo, los nuevos pagos con tarjeta utilizarán Clover.</p>
  {reviews.length>0&&<div role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><p className="font-bold">Pagos recibidos que requieren revisión</p><p>El saldo o estado cambió durante el cobro. Comprueba estos pagos en Clover antes de ajustar el pedido o emitir una devolución.</p><ul className="mt-2 space-y-2">{reviews.map(item=><li key={item.id} className="break-all">{item.target_type==="order"?"Pedido":"Envío"}: {item.target_id} · ${(item.total_cents/100).toFixed(2)} · Pago Clover: {item.payment_id}</li>)}</ul></div>}
  <div className="mt-4 space-y-3">
   <label className="block text-sm font-bold">Entorno<select className={input} value={environment} disabled={busy} onChange={e=>setEnvironment(e.target.value)}><option value="production">Producción — dinero real</option><option value="sandbox">Sandbox — pruebas</option></select></label>
   <label className="block text-sm font-bold">Merchant ID<input className={input} value={merchantId} disabled={busy} autoComplete="off" onChange={e=>setMerchantId(e.target.value)}/></label>
   <label className="block text-sm font-bold">Token privado<input type="password" className={input} value={privateToken} disabled={busy} autoComplete="new-password" placeholder={configured?"Guardado; deja vacío para conservarlo":"Private token de Hosted Checkout"} onChange={e=>setPrivateToken(e.target.value)}/></label>
   <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600"><p>En Clover: Settings → Ecommerce → Hosted Checkout → Webhook URL. Pega esta dirección, genera el Signing Secret y guarda los cambios:</p><code className="mt-2 block break-all select-all">{origin}/api/webhooks/clover/{storeId}</code><p className="mt-2">Deja vacías las Redirect URLs en Clover para utilizar el regreso correspondiente a cada pedido o envío. Usa las credenciales del entorno seleccionado.</p></div>
   <label className="block text-sm font-bold">Signing Secret del webhook<input type="password" className={input} value={webhookSecret} disabled={busy} autoComplete="new-password" placeholder={configured?"Guardado; deja vacío para conservarlo":"Secreto generado en Hosted Checkout"} onChange={e=>setWebhookSecret(e.target.value)}/></label>
   <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>setEnabled(e.target.checked)}/>Usar Clover para pagos con tarjeta</label>
   <p className="text-xs text-slate-500">Al desactivarlo, los nuevos cobros vuelven a la configuración de Stripe. Los pagos Clover ya iniciados siguen recibiendo confirmaciones.</p>
   <button type="button" disabled={busy} onClick={()=>void save()} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?"Procesando…":"Guardar Clover"}</button>
   {message&&<p role="status" className="text-sm font-bold text-slate-600">{message}</p>}
  </div>
 </section>;
}
