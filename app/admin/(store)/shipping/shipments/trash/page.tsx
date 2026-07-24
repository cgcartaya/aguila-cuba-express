"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, PackageOpen, RotateCcw, Search, Trash2 } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getTrashedShipmentsByStoreId, permanentlyDeleteShipment, restoreShipment } from "@/lib/services/shipping";
import type { Shipment } from "@/lib/shipping/types";

export default function ShipmentTrashPage() {
  const { access, isSuperAdmin, store: accessStore, loading: accessLoading } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(() => (isSuperAdmin ? selectedStore || accessStore : accessStore), [accessStore, isSuperAdmin, selectedStore]);
  const [rows, setRows] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!activeStore?.id) return setLoading(false);
    setLoading(true);
    setError("");
    const result = await getTrashedShipmentsByStoreId(activeStore.id);
    if (result.error) setError(result.error.message || "No se pudo cargar la papelera.");
    setRows(result.data || []);
    setLoading(false);
  }

  useEffect(() => { if (!accessLoading && !storeLoading) void load(); }, [accessLoading, storeLoading, activeStore?.id]);

  const filtered = rows.filter((row) => `${row.order_number || ""} ${row.tracking_code || ""} ${row.sender_name || ""} ${row.recipient_name || ""}`.toLowerCase().includes(search.toLowerCase()));

  async function restore(row: Shipment) {
    if (!activeStore?.id || !window.confirm(`¿Restaurar ${row.tracking_code || "este envío"}?`)) return;
    setWorkingId(row.id);
    const result = await restoreShipment(activeStore.id, row.id);
    if (result.error) setError(result.error.message || "No se pudo restaurar.");
    else setRows((current) => current.filter((item) => item.id !== row.id));
    setWorkingId(null);
  }

  async function remove(row: Shipment) {
    if (!activeStore?.id || !window.confirm(`¿Eliminar definitivamente ${row.tracking_code || "este envío"}? Esta acción no se puede deshacer.`)) return;
    setWorkingId(row.id);
    const result = await permanentlyDeleteShipment(activeStore.id, row.id);
    if (result.error) setError(result.error.message || "No se pudo eliminar definitivamente.");
    else setRows((current) => current.filter((item) => item.id !== row.id));
    setWorkingId(null);
  }

  return <main className="min-h-screen bg-[#f5f7fb] p-4 pb-24 md:p-7"><div className="mx-auto max-w-6xl">
    <header className="rounded-[2rem] bg-gradient-to-br from-[#061b3a] to-[#1554a6] p-6 text-white shadow-xl md:p-8">
      <Link href="/admin/shipping/shipments" className="inline-flex items-center gap-2 text-sm font-black text-blue-100"><ArrowLeft size={17}/> Volver a todos los envíos</Link>
      <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Recuperación segura</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Papelera de envíos</h1><p className="mt-2 text-blue-100/75">Restaura envíos eliminados por error o bórralos definitivamente.</p></div><span className="rounded-2xl bg-white/10 px-4 py-3 font-black">{rows.length} elemento(s)</span></div>
    </header>
    <div className="my-5 relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar orden, rastreo, cliente o destinatario" className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 font-semibold shadow-sm outline-none focus:border-blue-400"/></div>
    {error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}
    {loading ? <div className="rounded-3xl bg-white p-12 text-center"><Loader2 className="mx-auto animate-spin text-blue-700"/></div> : filtered.length === 0 ? <div className="rounded-3xl border border-dashed bg-white p-12 text-center"><PackageOpen className="mx-auto text-slate-300" size={48}/><h2 className="mt-4 text-xl font-black">La papelera está vacía</h2></div> : <div className="space-y-3">{filtered.map((row)=><article key={row.id} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-slate-400">Orden {row.order_number ? `#${row.order_number}` : "—"}</p><h2 className="mt-1 text-lg font-black text-[#061b3a]">{row.sender_name || "Sin cliente"} → {row.recipient_name || "Sin destinatario"}</h2><p className="mt-1 text-sm font-bold text-blue-700">{row.tracking_code || row.id.slice(0,8)}</p><p className="mt-2 text-xs text-slate-500">Eliminado: {row.deleted_at ? new Date(row.deleted_at).toLocaleString("es-US") : "Sin fecha"}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>void restore(row)} disabled={workingId===row.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><RotateCcw size={17}/> Restaurar</button><button onClick={()=>void remove(row)} disabled={workingId===row.id} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={17}/> Eliminar definitivamente</button></div></article>)}</div>}
  </div></main>;
}
