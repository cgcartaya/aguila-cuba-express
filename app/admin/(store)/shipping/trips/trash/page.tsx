"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RotateCcw, Route, Trash2 } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getTrashedShippingTripsByStoreId, permanentlyDeleteShippingTrip, restoreShippingTrip } from "@/lib/services/shipping-trips";
import type { ShippingTrip } from "@/lib/shipping/types";

export default function TripTrashPage() {
  const { isSuperAdmin, store: accessStore, loading: accessLoading } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(() => (isSuperAdmin ? selectedStore || accessStore : accessStore), [accessStore, isSuperAdmin, selectedStore]);
  const [rows, setRows] = useState<ShippingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() { if (!activeStore?.id) return setLoading(false); setLoading(true); const result=await getTrashedShippingTripsByStoreId(activeStore.id); if(result.error)setError(result.error.message||"No se pudo cargar la papelera."); setRows(result.data||[]); setLoading(false); }
  useEffect(()=>{if(!accessLoading&&!storeLoading)void load();},[accessLoading,storeLoading,activeStore?.id]);

  async function restore(row:ShippingTrip){if(!activeStore?.id||!window.confirm(`¿Restaurar “${row.name}” y los envíos eliminados junto con él?`))return;setWorkingId(row.id);const result=await restoreShippingTrip(activeStore.id,row.id);if(result.error)setError(result.error.message||"No se pudo restaurar.");else setRows(c=>c.filter(i=>i.id!==row.id));setWorkingId(null);}
  async function remove(row:ShippingTrip){if(!activeStore?.id||!window.confirm(`¿Eliminar definitivamente “${row.name}” y todos sus envíos? Esta acción no se puede deshacer.`))return;setWorkingId(row.id);const result=await permanentlyDeleteShippingTrip(activeStore.id,row.id);if(result.error)setError(result.error.message||"No se pudo eliminar definitivamente.");else setRows(c=>c.filter(i=>i.id!==row.id));setWorkingId(null);}

  return <main className="min-h-screen bg-[#f5f7fb] p-4 pb-24 md:p-7"><div className="mx-auto max-w-5xl"><header className="rounded-[2rem] bg-gradient-to-br from-[#061b3a] to-[#1554a6] p-6 text-white shadow-xl md:p-8"><Link href="/admin/shipping/trips" className="inline-flex items-center gap-2 text-sm font-black text-blue-100"><ArrowLeft size={17}/> Volver a viajes</Link><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-blue-200">Recuperación segura</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Papelera de viajes</h1><p className="mt-2 text-blue-100/75">Al restaurar un viaje también se recuperan los envíos que fueron eliminados junto con él.</p></header>{error&&<div className="my-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}{loading?<div className="mt-5 rounded-3xl bg-white p-12 text-center"><Loader2 className="mx-auto animate-spin text-blue-700"/></div>:rows.length===0?<div className="mt-5 rounded-3xl border border-dashed bg-white p-12 text-center"><Route className="mx-auto text-slate-300" size={50}/><h2 className="mt-4 text-xl font-black">No hay viajes en la papelera</h2></div>:<div className="mt-5 space-y-3">{rows.map(row=><article key={row.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Viaje {row.trip_number}</p><h2 className="mt-1 text-xl font-black text-[#061b3a]">{row.name}</h2><p className="mt-1 text-sm text-slate-500">{row.origin||"Origen sin definir"} → {row.destination||"Destino sin definir"}</p><p className="mt-2 text-xs text-slate-500">Eliminado: {row.deleted_at?new Date(row.deleted_at).toLocaleString("es-US"):"Sin fecha"}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>void restore(row)} disabled={workingId===row.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><RotateCcw size={17}/> Restaurar</button><button onClick={()=>void remove(row)} disabled={workingId===row.id} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={17}/> Eliminar definitivamente</button></div></article>)}</div>}</div></main>;
}
