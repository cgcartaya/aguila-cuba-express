"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Loader2, MapPin, MessageCircle, PlayCircle, Plus, Save, Search, Trash2, Truck, X } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  addPickupRequestsToRoute,
  getEligiblePickupRequestsForRoute,
  getPickupRoute,
  managePickupRoute,
  removePickupRouteStop,
  reorderPickupRouteStops,
  updatePickupRoute,
  updatePickupRouteStatus,
  updatePickupRouteStopStatus,
} from "@/lib/services/pickups";
import RouteSocialPoster from "@/components/pickups/RouteSocialPoster";
import {
  PICKUP_ROUTE_STATUS_LABELS,
  PICKUP_STOP_STATUS_LABELS,
  type PickupRequest,
  type PickupRoute,
  type PickupRouteStatus,
  type PickupRouteStopStatus,
} from "@/lib/pickups/types";

export default function PickupRouteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [route, setRoute] = useState<PickupRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [eligibleRequests, setEligibleRequests] = useState<Array<PickupRequest & { compatible_city: boolean }>>([]);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [requestSearch, setRequestSearch] = useState("");
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [addingRequests, setAddingRequests] = useState(false);

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    const result = await getPickupRoute(store.id, id);
    setRoute(result.data);
    setError(result.error?.message || "");
    setLoading(false);
  }

  useEffect(() => { load(); }, [store?.id, id]);

  const cities = useMemo(() => Array.from(new Set((route?.stops || []).map((stop) => stop.pickup_request?.city).filter(Boolean))), [route]);
  const completedStops = useMemo(() => (route?.stops || []).filter((stop) => stop.status === "picked_up").length, [route]);
  const activeStops = useMemo(() => (route?.stops || []).filter((stop) => ["en_route", "arrived"].includes(stop.status)).length, [route]);
  const progress = route?.stops?.length ? Math.round((completedStops / route.stops.length) * 100) : 0;
  const filteredEligibleRequests = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();
    if (!query) return eligibleRequests;
    return eligibleRequests.filter((item) =>
      [item.customer_name, item.request_code, item.city, item.address_line_1, item.postal_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [eligibleRequests, requestSearch]);

  async function openAddRequests() {
    if (!store?.id || !route) return;
    setAddOpen(true);
    setEligibleLoading(true);
    setSelectedRequestIds([]);
    setRequestSearch("");
    const result = await getEligiblePickupRequestsForRoute(store.id, route.id);
    setEligibleRequests(result.data);
    setError(result.error?.message || "");
    setEligibleLoading(false);
  }

  async function addSelectedRequests() {
    if (!store?.id || !route || !selectedRequestIds.length) return;
    setAddingRequests(true);
    const result = await addPickupRequestsToRoute({
      storeId: store.id,
      routeId: route.id,
      requestIds: selectedRequestIds,
    });
    setAddingRequests(false);
    if (result.error) return setError(result.error.message);
    setAddOpen(false);
    setSelectedRequestIds([]);
    await load();
  }

  function toggleSelectedRequest(requestId: string) {
    setSelectedRequestIds((current) =>
      current.includes(requestId)
        ? current.filter((id) => id !== requestId)
        : [...current, requestId]
    );
  }

  async function saveInfo() {
    if (!route || !store?.id) return;
    setSaving(true);
    const { error: updateError } = await updatePickupRoute(route.id, store.id, {
      name: route.name,
      route_date: route.route_date,
      driver_name: route.driver_name,
      driver_phone: route.driver_phone,
      vehicle_name: route.vehicle_name,
      public_summary: route.public_summary,
      notes: route.notes,
      is_public: route.is_public,
    });
    setSaving(false);
    if (updateError) setError(updateError.message);
  }

  async function changeRouteStatus(status: PickupRouteStatus) {
    if (!route || !store?.id) return;
    const { error: updateError } = await updatePickupRouteStatus(route.id, store.id, status);
    if (updateError) return setError(updateError.message);
    setRoute({ ...route, status, is_public: status === "published" ? true : route.is_public });
  }

  async function moveStop(index: number, direction: -1 | 1) {
    if (!route?.stops) return;
    const target = index + direction;
    if (target < 0 || target >= route.stops.length) return;
    const next = [...route.stops];
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((item, order) => { item.stop_order = order + 1; });
    setRoute({ ...route, stops: next });
    const result = await reorderPickupRouteStops(route.id, next.map((item) => item.id));
    if (result.error) { setError(result.error.message); load(); }
  }

  async function changeStopStatus(stopId: string, status: PickupRouteStopStatus) {
    if (!route?.stops) return;
    const { error: updateError } = await updatePickupRouteStopStatus(stopId, route.id, status);
    if (updateError) return setError(updateError.message);
    setRoute({ ...route, stops: route.stops.map((item) => item.id === stopId ? { ...item, status } : item) });
  }

  async function removeStop(stopId: string) {
    if (!route?.stops || !confirm("¿Quitar esta parada de la ruta?")) return;
    const { error: deleteError } = await removePickupRouteStop(stopId, route.id);
    if (deleteError) return setError(deleteError.message);
    setRoute({ ...route, stops: route.stops.filter((item) => item.id !== stopId) });
  }

  async function manageRoute(action: "cancel" | "delete" | "complete" | "duplicate") {
    if (!route || !store?.id) return;

    const messages = {
      cancel: "¿Cancelar esta ruta? Las solicitudes no recogidas volverán a Pendientes.",
      delete: "¿Eliminar esta ruta? Las solicitudes no recogidas volverán a Pendientes.",
      complete: "¿Completar esta ruta? Todas las paradas deben estar recogidas, fallidas u omitidas.",
      duplicate: "¿Duplicar la estructura de esta ruta como un nuevo borrador?",
    };

    if (!confirm(messages[action])) return;

    setSaving(true);
    const result = await managePickupRoute({
      storeId: store.id,
      routeId: route.id,
      action,
    });
    setSaving(false);

    if (result.error) return setError(result.error.message);

    if (action === "duplicate" && result.data?.duplicated_route_id) {
      window.location.href = `/admin/pickups/routes/${result.data.duplicated_route_id}`;
      return;
    }

    if (action === "delete") {
      window.location.href = "/admin/pickups/routes";
      return;
    }

    await load();
  }

  if (loading || accessLoading || storeLoading) return <div className="rounded-[2rem] border bg-white p-12 text-center"><Loader2 className="mx-auto animate-spin" /></div>;
  if (!route) return <div className="rounded-[2rem] border bg-white p-12 text-center font-black">Ruta no encontrada.</div>;

  return <div className="space-y-6">
    <header className="overflow-hidden rounded-[2rem] bg-[#071d43] p-6 text-white sm:p-8">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><Link href="/admin/pickups/routes" className="text-sm font-black text-blue-200">← Volver a rutas</Link><div className="mt-3 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-black sm:text-4xl">{route.name}</h1><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-blue-100">{PICKUP_ROUTE_STATUS_LABELS[route.status]}</span></div><p className="mt-2 text-blue-100/75">{route.route_date} · {route.stops?.length || 0} paradas · {cities.join(" · ") || "Sin ciudades"}</p></div><div className="flex flex-wrap gap-3"><select value={route.status} onChange={(e) => changeRouteStatus(e.target.value as PickupRouteStatus)} className="rounded-2xl bg-white px-4 py-3 font-black text-[#071d43]">{Object.entries(PICKUP_ROUTE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{route.status === "published" && <button onClick={() => changeRouteStatus("in_progress")} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-black"><PlayCircle size={18} /> Iniciar recorrido</button>}<button onClick={saveInfo} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-black"><Save size={18} /> Guardar</button></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-4"><Metric label="Paradas" value={route.stops?.length || 0} /><Metric label="Recogidas" value={completedStops} /><Metric label="En proceso" value={activeStops} /><Metric label="Progreso" value={`${progress}%`} /></div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} /></div>
    </header>

    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6">
        <h2 className="text-xl font-black">Datos de la ruta</h2>
        <div className="mt-5 space-y-4"><Field label="Nombre"><input className="input" value={route.name} onChange={(e) => setRoute({ ...route, name: e.target.value })} /></Field><Field label="Fecha"><input className="input" type="date" value={route.route_date} onChange={(e) => setRoute({ ...route, route_date: e.target.value })} /></Field><Field label="Conductor"><input className="input" value={route.driver_name || ""} onChange={(e) => setRoute({ ...route, driver_name: e.target.value })} /></Field><Field label="Teléfono"><input className="input" value={route.driver_phone || ""} onChange={(e) => setRoute({ ...route, driver_phone: e.target.value })} /></Field><Field label="Vehículo"><input className="input" value={route.vehicle_name || ""} onChange={(e) => setRoute({ ...route, vehicle_name: e.target.value })} /></Field><Field label="Resumen público"><textarea className="input min-h-24" value={route.public_summary || ""} onChange={(e) => setRoute({ ...route, public_summary: e.target.value })} placeholder="Ej. Columbia · Lexington · Gaston" /></Field></div>
        <label className="mt-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 font-black"><input type="checkbox" checked={route.is_public} onChange={(e) => setRoute({ ...route, is_public: e.target.checked })} className="h-5 w-5" /> Mostrar en el landing</label>
        <div className="mt-5 grid gap-2">
          <button
            onClick={() => manageRoute("duplicate")}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-black disabled:opacity-50"
          >
            Duplicar estructura
          </button>

          {route.status !== "completed" && route.status !== "cancelled" && (
            <button
              onClick={() => manageRoute("complete")}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 px-4 py-3 font-black text-emerald-700 disabled:opacity-50"
            >
              <CheckCircle2 size={17} /> Completar ruta
            </button>
          )}

          {route.status !== "completed" && route.status !== "cancelled" && (
            <button
              onClick={() => manageRoute("cancel")}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 px-4 py-3 font-black text-amber-700 disabled:opacity-50"
            >
              Cancelar ruta
            </button>
          )}

          {route.status !== "in_progress" && route.status !== "completed" && (
            <button
              onClick={() => manageRoute("delete")}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 font-black text-red-700 disabled:opacity-50"
            >
              <Trash2 size={17} /> Eliminar ruta
            </button>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-2xl font-black">Orden de paradas</h2><p className="text-slate-500">Usa las flechas para ordenar manualmente el recorrido.</p></div><div className="flex items-center gap-3"><button onClick={openAddRequests} disabled={["completed", "cancelled"].includes(route.status)} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"><Plus size={18} /> Agregar solicitudes</button><div className="rounded-2xl bg-blue-50 px-4 py-3 text-center"><p className="text-2xl font-black text-blue-700">{route.stops?.length || 0}</p><p className="text-xs font-black text-blue-500">paradas</p></div></div></div>
        <div className="mt-6 space-y-3">{route.stops?.map((stop, index) => { const item = stop.pickup_request; if (!item) return null; const whatsapp = encodeURIComponent(`Hola ${item.customer_name}, tu recogida ${item.request_code} está programada para ${route.route_date}. Te avisaremos cuando estemos cerca.`); return <article key={stop.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#071d43] text-lg font-black text-white">{index + 1}</div><div><h3 className="font-black">{item.customer_name} · {item.city}</h3><p className="text-sm font-bold text-slate-500">{item.address_line_1}, {item.postal_code} · {item.package_count} paquete(s)</p></div></div><div className="ml-auto flex flex-wrap items-center gap-2"><button onClick={() => moveStop(index, -1)} disabled={index === 0} className="rounded-xl border p-2 disabled:opacity-30"><ArrowUp size={17} /></button><button onClick={() => moveStop(index, 1)} disabled={index === (route.stops?.length || 0) - 1} className="rounded-xl border p-2 disabled:opacity-30"><ArrowDown size={17} /></button><select value={stop.status} onChange={(e) => changeStopStatus(stop.id, e.target.value as PickupRouteStopStatus)} className="rounded-xl border px-3 py-2 font-black">{Object.entries(PICKUP_STOP_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.formatted_address || `${item.address_line_1}, ${item.city}, ${item.region} ${item.postal_code}`)}`} target="_blank" rel="noreferrer" className="rounded-xl border p-2 text-blue-700"><ExternalLink size={17} /></a><a href={`https://wa.me/${item.phone.replace(/\D/g, "")}?text=${whatsapp}`} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-500 p-2 text-white"><MessageCircle size={17} /></a><button onClick={() => removeStop(stop.id)} className="rounded-xl border border-red-200 p-2 text-red-600"><Trash2 size={17} /></button></div></div></article>; })}</div>
      </section>
    </div>
    {addOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target && !addingRequests) setAddOpen(false); }}>
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b p-5 sm:p-6"><div><h2 className="text-2xl font-black">Agregar solicitudes a la ruta</h2><p className="mt-1 text-sm font-bold text-slate-500">Las solicitudes de las ciudades actuales aparecen primero. No se muestran las que ya pertenecen a otra ruta.</p></div><button onClick={() => !addingRequests && setAddOpen(false)} className="rounded-xl border p-2 text-slate-500"><X size={20} /></button></div>
        <div className="border-b p-4 sm:p-5"><label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3"><Search size={19} className="text-slate-400" /><input value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} className="w-full bg-transparent font-bold outline-none" placeholder="Buscar por cliente, código, ciudad o dirección..." /></label></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {eligibleLoading ? <div className="py-14 text-center"><Loader2 className="mx-auto animate-spin text-blue-600" /><p className="mt-3 font-bold text-slate-500">Buscando solicitudes disponibles...</p></div> : filteredEligibleRequests.length === 0 ? <div className="rounded-2xl border border-dashed p-10 text-center"><CheckCircle2 className="mx-auto text-emerald-500" /><p className="mt-3 font-black">No hay solicitudes disponibles</p><p className="mt-1 text-sm font-bold text-slate-500">Todas están asignadas, cerradas o no coinciden con la búsqueda.</p></div> : <div className="space-y-3">{filteredEligibleRequests.map((item) => { const selected = selectedRequestIds.includes(item.id); return <label key={item.id} className={`flex cursor-pointer gap-4 rounded-2xl border p-4 transition ${selected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"}`}><input type="checkbox" checked={selected} onChange={() => toggleSelectedRequest(item.id)} className="mt-1 h-5 w-5 shrink-0 accent-blue-600" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-black">{item.customer_name}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{item.request_code}</span>{item.compatible_city && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">Ciudad de esta ruta</span>}</div><p className="mt-1 text-sm font-bold text-slate-600"><MapPin size={14} className="mr-1 inline" />{item.address_line_1}, {item.city}, {item.region} {item.postal_code}</p><p className="mt-1 text-xs font-bold text-slate-500">{item.package_count} paquete(s){item.confirmed_date ? ` · Confirmada para ${item.confirmed_date}` : ""}</p></div></label>; })}</div>}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><p className="text-sm font-black text-slate-600">{selectedRequestIds.length} seleccionada(s)</p><div className="flex gap-3"><button onClick={() => setAddOpen(false)} disabled={addingRequests} className="rounded-2xl border bg-white px-5 py-3 font-black">Cancelar</button><button onClick={addSelectedRequests} disabled={!selectedRequestIds.length || addingRequests} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-40">{addingRequests ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Agregar a esta ruta</button></div></div>
      </div>
    </div>}
    <RouteSocialPoster route={route} storeName={store?.name || "YOYO ENVÍOS"} phone={route.driver_phone || store?.whatsapp || null} logoUrl={store?.logo_url || null} />
    <style jsx>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:1rem;padding:.8rem 1rem;font-weight:700;outline:none}.input:focus{border-color:#60a5fa}`}</style>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4"><p className="text-xs font-black uppercase tracking-wider text-blue-200">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>; }

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-black">{label}</span>{children}</label>; }
