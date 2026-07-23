"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Loader2, MapPin, MessageCircle, PlayCircle, Save, Trash2, Truck } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  deletePickupRoute,
  getPickupRoute,
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

  async function removeRoute() {
    if (!route || !store?.id || !confirm("¿Eliminar esta ruta completa?")) return;
    const { error: deleteError } = await deletePickupRoute(route.id, store.id);
    if (deleteError) return setError(deleteError.message);
    window.location.href = "/admin/pickups/routes";
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
        <button onClick={removeRoute} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 font-black text-red-700"><Trash2 size={17} /> Eliminar ruta</button>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-2xl font-black">Orden de paradas</h2><p className="text-slate-500">Usa las flechas para ordenar manualmente el recorrido.</p></div><div className="rounded-2xl bg-blue-50 px-4 py-3 text-center"><p className="text-2xl font-black text-blue-700">{route.stops?.length || 0}</p><p className="text-xs font-black text-blue-500">paradas</p></div></div>
        <div className="mt-6 space-y-3">{route.stops?.map((stop, index) => { const item = stop.pickup_request; if (!item) return null; const whatsapp = encodeURIComponent(`Hola ${item.customer_name}, tu recogida ${item.request_code} está programada para ${route.route_date}. Te avisaremos cuando estemos cerca.`); return <article key={stop.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#071d43] text-lg font-black text-white">{index + 1}</div><div><h3 className="font-black">{item.customer_name} · {item.city}</h3><p className="text-sm font-bold text-slate-500">{item.address_line_1}, {item.postal_code} · {item.package_count} paquete(s)</p></div></div><div className="ml-auto flex flex-wrap items-center gap-2"><button onClick={() => moveStop(index, -1)} disabled={index === 0} className="rounded-xl border p-2 disabled:opacity-30"><ArrowUp size={17} /></button><button onClick={() => moveStop(index, 1)} disabled={index === (route.stops?.length || 0) - 1} className="rounded-xl border p-2 disabled:opacity-30"><ArrowDown size={17} /></button><select value={stop.status} onChange={(e) => changeStopStatus(stop.id, e.target.value as PickupRouteStopStatus)} className="rounded-xl border px-3 py-2 font-black">{Object.entries(PICKUP_STOP_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.formatted_address || `${item.address_line_1}, ${item.city}, ${item.region} ${item.postal_code}`)}`} target="_blank" rel="noreferrer" className="rounded-xl border p-2 text-blue-700"><ExternalLink size={17} /></a><a href={`https://wa.me/${item.phone.replace(/\D/g, "")}?text=${whatsapp}`} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-500 p-2 text-white"><MessageCircle size={17} /></a><button onClick={() => removeStop(stop.id)} className="rounded-xl border border-red-200 p-2 text-red-600"><Trash2 size={17} /></button></div></div></article>; })}</div>
      </section>
    </div>
    <RouteSocialPoster route={route} storeName={store?.name || "YOYO ENVÍOS"} phone={route.driver_phone || store?.whatsapp || null} logoUrl={store?.logo_url || null} />
    <style jsx>{`.input{width:100%;border:1px solid #e2e8f0;border-radius:1rem;padding:.8rem 1rem;font-weight:700;outline:none}.input:focus{border-color:#60a5fa}`}</style>
  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4"><p className="text-xs font-black uppercase tracking-wider text-blue-200">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>; }

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-sm font-black">{label}</span>{children}</label>; }
