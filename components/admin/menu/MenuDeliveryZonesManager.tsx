"use client";
import {useEffect,useState} from "react";
import {MapPin,Plus,Save,Trash2} from "lucide-react";
import {deleteDeliveryZone,getDeliveryZones,saveDeliveryZone,type MenuDeliveryZone} from "@/lib/services/menu-delivery-zones-admin";

export default function MenuDeliveryZonesManager({storeId}:{storeId:string}){
 const [zones,setZones]=useState<MenuDeliveryZone[]>([]);
 const [d,setD]=useState({name:"",fee:0,minimum_order:0,estimated_minutes_min:30,estimated_minutes_max:45,is_active:true});
 const load=async()=>{const {data}=await getDeliveryZones(storeId);setZones((data||[]) as MenuDeliveryZone[])};
 useEffect(()=>{void load()},[storeId]);
 const add=async()=>{if(!d.name.trim())return alert("Escribe el nombre de la zona.");await saveDeliveryZone(storeId,{...d,sort_order:zones.length});setD({name:"",fee:0,minimum_order:0,estimated_minutes_min:30,estimated_minutes_max:45,is_active:true});await load()};
 return <div className="grid gap-5 lg:grid-cols-[1fr_390px]">
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Zonas de delivery</h2><p className="mt-1 text-xs text-slate-400">Tarifa, pedido mínimo y tiempo estimado por zona.</p>
   <div className="mt-4 space-y-3">{zones.map(z=><div key={z.id} className="flex items-center gap-3 rounded-2xl border p-4"><MapPin size={16}/><div className="flex-1"><b>{z.name}</b><p className="text-xs text-slate-400">${Number(z.fee).toFixed(2)} · mínimo ${Number(z.minimum_order).toFixed(2)} · {z.estimated_minutes_min||"—"}–{z.estimated_minutes_max||"—"} min</p></div><button onClick={async()=>{await saveDeliveryZone(storeId,{...z,is_active:!z.is_active});await load()}} className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black">{z.is_active?"ACTIVA":"INACTIVA"}</button><button onClick={async()=>{if(confirm("¿Eliminar zona?")){await deleteDeliveryZone(z.id);await load()}}} className="text-red-500"><Trash2 size={14}/></button></div>)}</div>
  </section>
  <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex gap-2 font-black"><Plus size={16}/>Nueva zona</h2><div className="mt-4 space-y-3"><input className="w-full rounded-xl border p-3" placeholder="Ej: Centro" value={d.name} onChange={e=>setD({...d,name:e.target.value})}/><input className="w-full rounded-xl border p-3" type="number" step=".01" placeholder="Tarifa" value={d.fee} onChange={e=>setD({...d,fee:Number(e.target.value)})}/><input className="w-full rounded-xl border p-3" type="number" step=".01" placeholder="Pedido mínimo" value={d.minimum_order} onChange={e=>setD({...d,minimum_order:Number(e.target.value)})}/><div className="grid grid-cols-2 gap-2"><input className="rounded-xl border p-3" type="number" value={d.estimated_minutes_min} onChange={e=>setD({...d,estimated_minutes_min:Number(e.target.value)})}/><input className="rounded-xl border p-3" type="number" value={d.estimated_minutes_max} onChange={e=>setD({...d,estimated_minutes_max:Number(e.target.value)})}/></div><button onClick={add} className="flex w-full justify-center gap-2 rounded-xl bg-slate-900 p-3 text-xs font-black text-white"><Save size={14}/>Guardar zona</button></div></aside>
 </div>
}
