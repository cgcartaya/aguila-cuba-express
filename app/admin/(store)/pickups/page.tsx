"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  confirmPickupRequestDate,
  getPickupRequests,
  updatePickupRequestStatus,
} from "@/lib/services/pickups";
import {
  PICKUP_STATUS_LABELS,
  type PickupRequest,
  type PickupRequestStatus,
} from "@/lib/pickups/types";

const statuses = Object.keys(PICKUP_STATUS_LABELS) as PickupRequestStatus[];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-US", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`));
}

export default function PickupsAdminPage() {
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    setError("");
    const result = await getPickupRequests(store.id);
    if (result.error) setError((result.error as any).message || "No pudimos cargar las solicitudes.");
    setRequests(result.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [store?.id]);

  const filtered = useMemo(() => requests.filter((item) => {
    const haystack = `${item.request_code} ${item.customer_name} ${item.phone} ${item.city} ${item.postal_code}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (status === "all" || item.status === status);
  }), [requests, search, status]);

  const metrics = {
    new: requests.filter((item) => item.status === "new").length,
    confirmed: requests.filter((item) => item.status === "confirmed").length,
    picked: requests.filter((item) => item.status === "picked_up").length,
    cities: new Set(requests.map((item) => item.city.toLowerCase())).size,
  };

  async function changeStatus(item: PickupRequest, nextStatus: PickupRequestStatus) {
    const previous = item.status;
    setRequests((current) => current.map((row) => row.id === item.id ? { ...row, status: nextStatus } : row));
    const result = await updatePickupRequestStatus(item.store_id, item.id, nextStatus);
    if (result.error) {
      setRequests((current) => current.map((row) => row.id === item.id ? { ...row, status: previous } : row));
      setError(result.error.message);
    }
  }

  async function confirmDate(item: PickupRequest, date: string) {
    const result = await confirmPickupRequestDate(item.store_id, item.id, date || null);
    if (result.error) return setError(result.error.message);
    setRequests((current) => current.map((row) => row.id === item.id ? { ...row, confirmed_date: date || null, status: date ? "confirmed" : "pending_confirmation" } : row));
  }

  if (accessLoading || storeLoading || loading) {
    return <div className="rounded-[2rem] border bg-white p-12 text-center font-bold text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin" />Cargando recogidas...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[2.2rem] bg-gradient-to-br from-[#061b3a] via-[#0a3474] to-[#1174c4] p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-200">Operación local</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Solicitudes de recogida</h1><p className="mt-3 max-w-2xl font-semibold text-blue-100/75">Organiza las solicitudes por ciudad, confirma fechas y prepara las próximas rutas.</p></div>
          <button onClick={load} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#061b3a]"><RefreshCw size={18} /> Actualizar</button>
        </div>
        <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Nuevas" value={metrics.new} icon={<Clock3 size={18} />} />
          <Metric label="Confirmadas" value={metrics.confirmed} icon={<CheckCircle2 size={18} />} />
          <Metric label="Recogidas" value={metrics.picked} icon={<Truck size={18} />} />
          <Metric label="Ciudades" value={metrics.cities} icon={<MapPin size={18} />} />
        </div>
      </header>

      <section className="grid gap-3 rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_260px]">
        <label className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por cliente, ciudad, teléfono o código..." className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 font-bold outline-none focus:border-blue-400" /></label>
        <label className="relative"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-black outline-none"><option value="all">Todos los estados</option>{statuses.map((value) => <option key={value} value={value}>{PICKUP_STATUS_LABELS[value]}</option>)}</select></label>
      </section>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

      {filtered.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center"><Truck className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 text-xl font-black">No hay solicitudes con estos filtros</h2></div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((item) => {
            const whatsappText = encodeURIComponent(`Hola ${item.customer_name}, te escribimos de ${store?.name || "la agencia"} sobre tu solicitud de recogida ${item.request_code} en ${item.city}.`);
            return (
              <article key={item.id} className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-lg sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{item.request_code}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{PICKUP_STATUS_LABELS[item.status]}</span></div><h2 className="mt-3 text-xl font-black text-slate-950">{item.customer_name}</h2><p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-600"><MapPin size={16} className="text-red-500" /> {item.address_line_1}, {item.city}, {item.region} {item.postal_code}</p></div>
                  <a href={`https://wa.me/${item.phone.replace(/\D/g, "")}?text=${whatsappText}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white"><MessageCircle size={18} /> WhatsApp</a>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <Info icon={<Package size={17} />} label="Paquetes" value={`${item.package_count} · ${item.package_type || "Sin tipo"}`} />
                  <Info icon={<CalendarDays size={17} />} label="Preferencias" value={(item.preferred_dates || []).map(formatDate).join(" · ") || "Sin fecha"} />
                  <Info icon={<Clock3 size={17} />} label="Recibida" value={new Intl.DateTimeFormat("es-US", { dateStyle: "medium" }).format(new Date(item.created_at))} />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <select value={item.status} onChange={(e) => changeStatus(item, e.target.value as PickupRequestStatus)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black outline-none">{statuses.map((value) => <option key={value} value={value}>{PICKUP_STATUS_LABELS[value]}</option>)}</select>
                  <select value={item.confirmed_date || ""} onChange={(e) => confirmDate(item, e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-black outline-none"><option value="">Confirmar una fecha...</option>{(item.preferred_dates || []).map((date) => <option key={date} value={date}>{formatDate(date)}</option>)}</select>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><div className="flex items-center gap-2 text-blue-200">{icon}<span className="text-xs font-black uppercase tracking-wider">{label}</span></div><p className="mt-2 text-3xl font-black">{value}</p></div>; }
function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">{icon}{label}</p><p className="mt-2 text-sm font-black text-slate-800">{value}</p></div>; }
