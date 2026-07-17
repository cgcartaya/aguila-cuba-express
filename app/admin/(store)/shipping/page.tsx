"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Edit3, Loader2, PackageSearch, Plus, Search, Trash2, Truck } from "lucide-react";
import InvoiceActions from "@/components/admin/shipping/InvoiceActions";
import ShippingStatusBadge from "@/components/admin/shipping/ShippingStatusBadge";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getShipmentsByStoreId, moveShipmentToTrash } from "@/lib/services/shipping";
import type { Shipment } from "@/lib/shipping/types";

export default function ShippingPage() {
  const { access, loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(() => (isSuperAdmin ? selectedStore || accessStore : accessStore), [accessStore, isSuperAdmin, selectedStore]);

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [errorMessage, setErrorMessage] = useState("");

  async function load() {
    if (!activeStore?.id) { setShipments([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await getShipmentsByStoreId(activeStore.id);
    if (error) { setErrorMessage(error.message); setShipments([]); }
    else setShipments(data || []);
    setLoading(false);
  }

  useEffect(() => { if (!accessLoading && !storeLoading) void load(); }, [accessLoading, storeLoading, activeStore?.id]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shipments.filter((s) =>
      (status === "all" || s.status === status) &&
      (!query ||
        s.tracking_code?.toLowerCase().includes(query) ||
        s.recipient_name?.toLowerCase().includes(query) ||
        s.recipient_phone?.includes(query) ||
        s.sender_name?.toLowerCase().includes(query) ||
        s.location.toLowerCase().includes(query))
    );
  }, [search, shipments, status]);

  async function trash(shipment: Shipment) {
    if (!activeStore?.id || !window.confirm(`¿Mover ${shipment.tracking_code || "este envío"} a la papelera?`)) return;
    const { error } = await moveShipmentToTrash(activeStore.id, shipment.id);
    if (error) return alert(error.message);
    setShipments((current) => current.filter((item) => item.id !== shipment.id));
  }

  const canCreate = access?.isSuperAdmin || ["OWNER", "ADMIN", "OPERATIONS"].includes(access?.storeMembership?.role || "");

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="text-sm font-black text-blue-700">Operaciones</p><h1 className="text-3xl font-black text-[#061b3a] md:text-4xl">Envíos</h1><p className="mt-1 text-sm font-semibold text-slate-500">{activeStore?.name}</p></div>
          {canCreate && activeStore && <Link href="/admin/shipping/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white"><Plus size={19}/>Nuevo envío</Link>}
        </header>

        <section className="mb-5 rounded-3xl border bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_240px]">
            <label className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19}/><input value={search} onChange={(e)=>setSearch(e.target.value)} className="w-full rounded-2xl border py-3 pl-12 pr-4 text-sm font-semibold" placeholder="Código, nombre, teléfono o lugar"/></label>
            <select value={status} onChange={(e)=>setStatus(e.target.value)} className="rounded-2xl border bg-white px-4 py-3 text-sm font-bold"><option value="all">Todos los estados</option><option value="received_miami">Recibido en Miami</option><option value="preparing">Preparando</option><option value="in_transit">En tránsito</option><option value="received_cuba">Recibido en Cuba</option><option value="out_for_delivery">En reparto</option><option value="delivered">Entregado</option><option value="issue">Incidencia</option></select>
          </div>
        </section>

        {errorMessage && <div className="mb-5 rounded-2xl bg-red-50 p-4 font-bold text-red-700">{errorMessage}</div>}

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-3xl border bg-white p-10 text-center font-bold text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin"/>Cargando envíos...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border bg-white p-10 text-center"><PackageSearch className="mx-auto mb-4 text-slate-300" size={44}/><h2 className="text-xl font-black">No hay envíos</h2></div>
        ) : (
          <div className="space-y-3">
            {filtered.map((shipment) => (
              <article key={shipment.id} className="rounded-3xl border bg-white p-4 shadow-sm md:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Truck size={23}/></div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-[#061b3a]">{shipment.tracking_code || shipment.id.slice(0,8)}</h2><ShippingStatusBadge status={shipment.status}/></div>
                      <p className="mt-2 font-black">{shipment.recipient_name || "Sin destinatario"}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{shipment.location} · {shipment.recipient_phone || "Sin teléfono"}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-black">
                        {shipment.contains_package && <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">Paquete · {Number(shipment.weight_lb || 0).toFixed(2)} lb</span>}
                        {shipment.contains_money && <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Dinero · ${Number(shipment.money_amount || 0).toFixed(2)}</span>}
                        <span className="rounded-full bg-slate-100 px-3 py-1">Total · ${Number(shipment.service_price || 0).toFixed(2)}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">Repartidor: <span className="font-bold">{shipment.assigned_driver_name || "Sin asignar"}</span></p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <InvoiceActions shipment={shipment} compact/>
                    <Link href={`/admin/shipping/${shipment.id}/edit`} className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black"><Edit3 size={17}/>Editar</Link>
                    <button onClick={()=>void trash(shipment)} className="inline-flex items-center gap-2 rounded-2xl border border-red-100 px-4 py-2.5 text-sm font-black text-red-600"><Trash2 size={17}/>Papelera</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
