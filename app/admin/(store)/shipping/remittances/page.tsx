'use client';
import { useCallback,useEffect,useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/hooks/useStore';
import { useAdminAccess } from '@/hooks/useAdminAccess';
type Order={id:string;payload:Record<string,string>;amount:number;commission:number;total:number;status:string;shipment_id:string|null;payment_reference:string|null;created_at:string};
const usd=(value:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
export default function RemittanceOrders(){
 const {store:selected}=useStore();const {store:accessStore,isSuperAdmin}=useAdminAccess();
 const store=isSuperAdmin?(selected??accessStore):accessStore;
 const storeId=store?.id;
 const [orders,setOrders]=useState<Order[]>([]);const [status,setStatus]=useState('pending');const [page,setPage]=useState(0);
 const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [success,setSuccess]=useState('');
 const [action,setAction]=useState<{order:Order;type:'confirm'|'cancel'}|null>(null);
 const [reference,setReference]=useState('');const [received,setReceived]=useState('');
 const load=useCallback(async()=>{
  if(!storeId)return;
  setLoading(true);setError('');
  try{
   const {data:{session}}=await supabase.auth.getSession();
   const response=await fetch(`/api/admin/remittances?${new URLSearchParams({storeId,status,page:String(page)})}`,{headers:{Authorization:`Bearer ${session?.access_token??''}`},cache:'no-store'});
   const data=await response.json();if(!response.ok)throw Error(data.error);setOrders(data.orders);
  }catch(e){setError((e as Error).message||'No se pudieron cargar los pedidos.');}finally{setLoading(false);}
 },[storeId,status,page]);
 useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer);},[load]);
 async function save(){
  if(!action||!store?.id||busy)return;
  if(action.type==='confirm'&&Number(received.replace(',','.'))!==Number(action.order.total)){setError('El importe recibido debe coincidir con el total del pedido.');return;}
  setBusy(true);setError('');setSuccess('');
  try{
   const {data:{session}}=await supabase.auth.getSession();
   const response=await fetch('/api/admin/remittances',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session?.access_token??''}`},body:JSON.stringify({storeId:store.id,id:action.order.id,action:action.type,payment_reference:reference})});
   const data=await response.json();if(!response.ok)throw Error(data.error);
   setSuccess(action.type==='confirm'?'Pago confirmado. El envío de dinero ya está registrado sin viaje.':'Pedido cancelado.');setAction(null);await load();
  }catch(e){setError((e as Error).message||'No se pudo completar la operación.');}finally{setBusy(false);}
 }
 return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
  <Link href="/admin/shipping" className="text-sm font-bold text-blue-700">← Volver a Envíos</Link>
  <header><h1 className="text-2xl font-black text-slate-900">Compras de remesas</h1><p className="mt-2 text-sm text-slate-500">Compras recibidas desde la tienda. Confirma únicamente pagos ya recibidos y verificados: se creará un envío de dinero sin viaje, listo para asignarlo a un repartidor.</p></header>
  <div className="flex flex-wrap gap-3"><select aria-label="Estado del pedido" value={status} disabled={busy} onChange={e=>{setStatus(e.target.value);setPage(0);}} className="rounded-xl border bg-white p-3"><option value="pending">Pendientes de pago</option><option value="paid">Pagados</option><option value="cancelled">Cancelados</option></select><button onClick={()=>void load()} disabled={loading||busy} className="rounded-xl border bg-white px-4 font-bold">Actualizar</button></div>
  {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
  {success&&<p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">{success}</p>}
  {loading?<p>Cargando pedidos…</p>:orders.length===0?<p className="rounded-2xl border bg-white p-8 text-slate-500">No hay pedidos en esta página.</p>:<div className="space-y-4">{orders.map(order=><article key={order.id} className="rounded-2xl border bg-white p-5 shadow-sm">
   <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p><h2 className="mt-1 font-bold">{order.payload.sender_name} → {order.payload.recipient_name}</h2><p className="mt-2 break-all font-mono text-xs text-slate-500">{order.id}</p></div><div className="text-right"><p className="text-xl font-black">{usd(order.total)}</p><p className="text-sm text-slate-500">Remesa {usd(order.amount)} + comisión {usd(order.commission)}</p></div></div>
   <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2"><p>Remitente: {order.payload.sender_phone}</p><p>Destinatario: {order.payload.recipient_phone}</p><p className="sm:col-span-2">{order.payload.recipient_address}, {order.payload.recipient_municipality}, {order.payload.recipient_province}</p>{order.payload.notes&&<p className="sm:col-span-2">Indicaciones: {order.payload.notes}</p>}</div>
   {order.payment_reference&&<p className="mt-3 text-sm">Pago: {order.payment_reference}</p>}
   <div className="mt-4 flex flex-wrap gap-3">{order.status==='pending'?<><button disabled={busy} onClick={()=>{setAction({order,type:'confirm'});setReference('');setReceived('');setError('');}} className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white">Confirmar pago recibido</button><button disabled={busy} onClick={()=>{setAction({order,type:'cancel'});setError('');}} className="rounded-xl border px-4 py-3 font-bold">Cancelar pedido</button></>:order.shipment_id?<Link href={`/admin/shipping/${encodeURIComponent(order.shipment_id)}`} className="font-bold text-blue-700 underline">Abrir envío de dinero</Link>:null}</div>
  </article>)}</div>}
  <div className="flex items-center justify-between"><button disabled={page===0||loading||busy} onClick={()=>setPage(v=>v-1)} className="rounded-xl border px-4 py-2 disabled:opacity-40">Anterior</button><span className="text-sm">Página {page+1}</span><button disabled={orders.length<50||loading||busy} onClick={()=>setPage(v=>v+1)} className="rounded-xl border px-4 py-2 disabled:opacity-40">Siguiente</button></div>
  {action&&<div className="fixed inset-0 z-[100] grid place-items-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="remittance-confirm-title" className="w-full max-w-lg rounded-3xl bg-white p-6"><h2 id="remittance-confirm-title" className="text-xl font-black">{action.type==='confirm'?'Confirmar pago recibido':'Cancelar pedido'}</h2><p className="mt-3 text-sm text-slate-600">{action.type==='confirm'?`Confirma que recibiste y verificaste ${usd(action.order.total)}. Esta acción genera el envío de dinero para reparto.`:'Se cancelará el pedido pendiente. No se creará ningún envío.'}</p>{action.type==='confirm'&&<><label className="mt-4 block text-sm font-bold">Importe recibido (USD)<input autoFocus inputMode="decimal" value={received} onChange={e=>setReceived(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label><label className="mt-4 block text-sm font-bold">Referencia o comprobante del pago<input maxLength={120} value={reference} onChange={e=>setReference(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label></>}{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<div className="mt-6 flex gap-3"><button disabled={busy||action.type==='confirm'&&(reference.trim().length<3||Number(received.replace(',','.'))!==Number(action.order.total))} onClick={()=>void save()} className="rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-40">{busy?'Procesando…':'Confirmar'}</button><button disabled={busy} onClick={()=>setAction(null)} className="rounded-xl border px-5 py-3">Volver</button></div></section></div>}
 </main>;
}
