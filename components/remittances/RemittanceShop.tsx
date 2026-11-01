'use client';
import { useEffect,useRef,useState } from 'react';
import { useParams,useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft,ArrowRight,CheckCircle2,Loader2,ShoppingBag,WalletCards } from 'lucide-react';
import { CUBA_PROVINCES } from '@/lib/checkout/cuba-provinces';
import { remittanceAmount } from '@/lib/remittances/validation';
import { ALVAREZ_WHATSAPP_URL } from '@/components/landing/alvarez/constants';
type Quote={amount:number;commission:number;rate:number;total:number;currency:string};
type Order={reference:string;status:string;amount:number;commission:number;total:number;trackingCode?:string|null};
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
const inputClass='mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100';
const empty={sender_name:'',sender_phone:'',recipient_name:'',recipient_phone:'',recipient_address:'',recipient_province:'La Habana',recipient_municipality:'',notes:''};
export default function RemittanceShop(){
 const params=useParams<{slug?:string}>();const search=useSearchParams();const slug=params.slug??'';
 const [amount,setAmount]=useState(search.get('amount')??'100');
 const [quote,setQuote]=useState<Quote|null>(null);const [agency,setAgency]=useState('Álvarez Travel');
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [step,setStep]=useState<'cart'|'checkout'|'done'>(search.get('reference')?'done':'cart');
 const [order,setOrder]=useState<Order|null>(null);const [details,setDetails]=useState(empty);const [accepted,setAccepted]=useState(false);
 const [retry,setRetry]=useState(0);const key=useRef<{payload:string;id:string}|null>(null);
 const generation=useRef(0);
 const reference=search.get('reference');
 async function loadOrder(ref:string){
  setBusy(true);setError('');
  try{const response=await fetch(`/api/public/remittances/orders?${new URLSearchParams({...(slug?{slug}:{}),reference:ref})}`,{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error);setOrder(data.order);}
  catch(e){setError((e as Error).message||'No se pudo consultar el pedido.');}finally{setBusy(false);}
 }
 useEffect(()=>{
  if(!reference)return;
  let active=true;
  fetch(`/api/public/remittances/orders?${new URLSearchParams({...(slug?{slug}:{}),reference})}`,{cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error);if(active){setOrder(data.order);setStep('done');setLoading(false);}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});
  return()=>{active=false;};
 },[reference,slug]);
 useEffect(()=>{
  if(reference)return;
  const version=++generation.current;const controller=new AbortController();
  const timer=setTimeout(()=>{
   setQuote(null);setLoading(true);setError('');setAccepted(false);
   let normalized:number;
   try{normalized=remittanceAmount(amount);}catch(e){setError((e as Error).message);setLoading(false);return;}
   const query=new URLSearchParams({...(slug?{slug}:{}),amount:normalized.toFixed(2)});
   fetch(`/api/public/remittances/quote?${query}`,{signal:controller.signal,cache:'no-store'}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error);if(generation.current===version){setQuote(data.quote);setAgency(data.agency.name);setLoading(false);}}).catch(e=>{if(!controller.signal.aborted&&generation.current===version){setError(e.message||'No se pudo cotizar.');setLoading(false);}});
  },300);
  return()=>{clearTimeout(timer);controller.abort();};
 },[amount,slug,retry,reference]);
 async function submit(event:React.FormEvent){
  event.preventDefault();if(busy||!quote||!accepted)return;
  setBusy(true);setError('');
  const payload={...details,amount:remittanceAmount(amount).toFixed(2),slug,expected_total:quote.total};
  const fingerprint=JSON.stringify({...details,amount:payload.amount,slug});
  if(key.current?.payload!==fingerprint)key.current={payload:fingerprint,id:crypto.randomUUID()};
  try{
   const response=await fetch('/api/public/remittances/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,idempotency_key:key.current.id})});
   const data=await response.json();if(!response.ok){if(response.status===409){setRetry(v=>v+1);setAccepted(false);setQuote(null);setLoading(true);}throw Error(data.error);}
   setOrder(data.order);setStep('done');setDetails(empty);
   window.history.replaceState(null,'',`${window.location.pathname}?reference=${data.order.reference}`);
  }catch(e){setError((e as Error).message||'No se pudo registrar. Puedes volver a intentarlo sin duplicar el pedido.');}finally{setBusy(false);}
 }
 const summary=order??quote;
 return <main className="mx-auto min-h-[70vh] max-w-5xl px-4 py-8 pb-16 text-slate-900 sm:px-6 sm:py-12">
  <Link href={slug?`/tienda/${slug}`:'/tienda'} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/> Volver a la tienda</Link>
  <div className="mt-6 flex items-center gap-3"><span className="rounded-2xl bg-[#091D3D] p-3 text-white"><WalletCards size={28}/></span><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">{agency}</p><h1 className="text-2xl font-black sm:text-3xl">{step==='done'?'Tu pedido de remesa':step==='checkout'?'Completa tu remesa':'Tu carrito de remesa'}</h1></div></div>
  <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">La remesa se compra por separado de los productos físicos. El destinatario recibe el importe indicado; la comisión se añade al total.</p>
  <ol className="mt-7 flex gap-6 text-sm font-bold"><li className={step==='cart'?'text-blue-700':'text-slate-400'}>1. Importe</li><li className={step==='checkout'?'text-blue-700':'text-slate-400'}>2. Datos y pago</li><li className={step==='done'?'text-blue-700':'text-slate-400'}>3. Pedido</li></ol>
  {error&&<div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button className="ml-3 font-bold underline" onClick={()=>reference?void loadOrder(reference):setRetry(v=>v+1)}>Reintentar</button></div>}
  {step==='done'?<section className="mt-7 rounded-3xl border border-blue-100 bg-white p-6 shadow-sm sm:p-8">
   {!order?<p>{loading?'Cargando pedido…':'Consulta la referencia con la agencia.'}</p>:<>
    <CheckCircle2 className="text-blue-700" size={36}/><h2 className="mt-4 text-2xl font-black">{order.status==='paid'?'Pago confirmado':order.status==='cancelled'?'Pedido cancelado':'Pedido recibido · Pago pendiente'}</h2>
    <p className="mt-3 text-sm text-slate-600">{order.status==='paid'?'Tu envío de dinero ya está registrado para organizar la entrega.':order.status==='cancelled'?'La agencia canceló este pedido. Puedes crear una nueva remesa desde la tienda.':'Contacta con la agencia para recibir las instrucciones de pago. La remesa se registra para reparto únicamente cuando la agencia confirma haber recibido el pago.'}</p>
    <p className="mt-5 break-all rounded-xl bg-slate-50 p-4 font-mono text-sm">Referencia: {order.reference}</p>
    <p className="mt-4 text-xl font-bold">Total: {money(order.total)} USD</p>
    <p className="mt-1 text-sm text-slate-600">Destinatario recibe {money(order.amount)} · Comisión {money(order.commission)}</p>
    {order.status==='pending'&&<a href={`${ALVAREZ_WHATSAPP_URL}?text=${encodeURIComponent(`Hola, quiero coordinar el pago de mi remesa. Pedido: ${order.reference}. Importe: ${money(order.amount)} USD. Total: ${money(order.total)} USD.`)}`} target="_blank" rel="noreferrer" className="mt-6 inline-flex rounded-xl bg-[#CA0C28] px-5 py-3 font-bold text-white">Coordinar pago con la agencia</a>}
    <button onClick={()=>void loadOrder(order.reference)} disabled={busy} className="ml-3 mt-4 rounded-xl border px-4 py-3 font-bold disabled:opacity-50">{busy?'Consultando…':'Consultar estado'}</button>
    {order.trackingCode&&<Link href={`/rastrear/${encodeURIComponent(order.trackingCode)}`} className="mt-5 block font-bold text-blue-700 underline">Rastrear mi remesa</Link>}
    <p className="mt-5 text-xs text-slate-500">Guarda este enlace y tu referencia para consultar el estado. No compartas el enlace públicamente.</p>
   </>}
  </section>:<div className="mt-7 grid gap-6 lg:grid-cols-[1fr_340px]">
   <section className="rounded-3xl border bg-white p-6 shadow-sm sm:p-8">
    {step==='cart'?<>
     <div className="flex items-center gap-2 text-lg font-bold"><ShoppingBag size={22}/> Enviar dinero a Cuba <span className="ml-auto text-xs text-slate-400">1 remesa</span></div>
     <label htmlFor="remesa-importe" className="mt-7 block font-bold">Importe que recibirá el destinatario (USD)</label>
     <input id="remesa-importe" inputMode="decimal" maxLength={12} value={amount} onChange={e=>{setAmount(e.target.value);setAccepted(false);setQuote(null);setLoading(true);}} className={`${inputClass} text-3xl font-black`}/>
     <p className="mt-3 text-sm text-slate-500">La cantidad del carrito representa una remesa. El importe se calcula con las tarifas actuales de Envíos.</p>
     <button disabled={!quote||loading} onClick={()=>setStep('checkout')} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#091D3D] px-5 py-4 font-bold text-white disabled:opacity-50">Continuar al checkout <ArrowRight size={18}/></button>
    </>:<form onSubmit={submit} className="space-y-5">
     <button type="button" onClick={()=>setStep('cart')} className="text-sm font-bold text-blue-700">← Cambiar importe</button>
     <h2 className="text-lg font-bold">Datos del remitente</h2>
     {(['sender_name','sender_phone'] as const).map(field=><label key={field} className="block text-sm font-semibold">{field==='sender_name'?'Nombre y apellidos':'Teléfono con prefijo del país'}<input required type={field==='sender_phone'?'tel':'text'} autoComplete={field==='sender_phone'?'tel':'name'} maxLength={field==='sender_phone'?30:120} value={details[field]} onChange={e=>setDetails({...details,[field]:e.target.value})} className={inputClass}/></label>)}
     <h2 className="border-t pt-5 text-lg font-bold">Destinatario en Cuba</h2>
     {(['recipient_name','recipient_phone','recipient_address','recipient_municipality'] as const).map(field=><label key={field} className="block text-sm font-semibold">{{recipient_name:'Nombre y apellidos',recipient_phone:'Teléfono con prefijo +53',recipient_address:'Dirección completa',recipient_municipality:'Municipio'}[field]}<input required type={field==='recipient_phone'?'tel':'text'} maxLength={field==='recipient_address'?400:field==='recipient_phone'?30:120} value={details[field]} onChange={e=>setDetails({...details,[field]:e.target.value})} className={inputClass}/></label>)}
     <label className="block text-sm font-semibold">Provincia<select value={details.recipient_province} onChange={e=>setDetails({...details,recipient_province:e.target.value})} className={inputClass}>{CUBA_PROVINCES.map(p=><option key={p}>{p}</option>)}</select></label>
     <label className="block text-sm font-semibold">Indicaciones de entrega (opcional)<textarea maxLength={500} value={details.notes} onChange={e=>setDetails({...details,notes:e.target.value})} className={inputClass}/></label>
     <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6"><strong>Pago coordinado con la agencia</strong><p>Al confirmar el pedido recibirás tu referencia y podrás contactar con la agencia para conocer cómo pagar. No se realizará ningún cargo automático.</p></div>
     <label className="flex items-start gap-3 text-sm"><input required type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1"/>Confirmo el importe y los datos del destinatario. Entiendo que el pago debe ser recibido y confirmado por la agencia antes de organizar la entrega.</label>
     <button disabled={busy||loading||!quote||!accepted} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#CA0C28] px-5 py-4 font-bold text-white disabled:opacity-50">{busy?<Loader2 className="animate-spin" size={20}/>:null}{busy?'Registrando pedido…':'Confirmar pedido de remesa'}</button>
    </form>}
   </section>
   <aside className="h-fit rounded-3xl bg-[#091D3D] p-6 text-white lg:sticky lg:top-24"><h2 className="text-lg font-bold">Resumen de tu remesa</h2>{loading?<p className="mt-6">Consultando tarifas…</p>:summary?<dl className="mt-6 space-y-4"><div className="flex justify-between gap-2"><dt className="text-blue-200">Destinatario recibe</dt><dd className="font-bold">{money(summary.amount)}</dd></div><div className="flex justify-between"><dt className="text-blue-200">Comisión</dt><dd>{money(summary.commission)}</dd></div><div className="flex justify-between border-t border-white/20 pt-4"><dt className="font-bold">Total a pagar</dt><dd className="text-2xl font-black">{money(summary.total)}</dd></div></dl>:<p className="mt-6 text-sm text-blue-200">Introduce un importe válido para cotizar.</p>}<p className="mt-5 text-xs leading-5 text-blue-200">Importes en USD. Comisión calculada con la configuración de remesas de la agencia.</p></aside>
  </div>}
 </main>;
}
