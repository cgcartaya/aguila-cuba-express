"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Timer,
  Trophy,
} from "lucide-react";

import type {
  StaffAnalyticsShipment,
  StaffAnalyticsTrip,
  StaffUser,
} from "@/lib/shipping/staff-types";

type Period = "30" | "90" | "all";

type StatusGroup = "preparing" | "transit" | "delivery" | "delivered" | "issue";

type DriverStats = {
  user: StaffUser;
  total: number;
  delivered: number;
  averageDays: number | null;
  completionRate: number;
  statusCounts: Record<StatusGroup, number>;
  weekly: number[];
};

const statusGroups: Array<{
  key: StatusGroup;
  label: string;
  color: string;
  text: string;
}> = [
  { key: "preparing", label: "Preparando", color: "bg-[#123564]", text: "text-[#123564]" },
  { key: "transit", label: "En tránsito", color: "bg-blue-500", text: "text-blue-600" },
  { key: "delivery", label: "En reparto", color: "bg-violet-500", text: "text-violet-600" },
  { key: "delivered", label: "Entregado", color: "bg-emerald-500", text: "text-emerald-600" },
  { key: "issue", label: "Incidencia", color: "bg-orange-500", text: "text-orange-600" },
];

function groupStatus(status: string): StatusGroup {
  if (status === "delivered") return "delivered";
  if (status === "issue") return "issue";
  if (status === "out_for_delivery") return "delivery";
  if (["in_transit", "received_cuba"].includes(status)) return "transit";
  return "preparing";
}

function startOfDay(value: Date) {
  const result = new Date(value);
  result.setHours(0, 0, 0, 0);
  return result;
}

function daysBetween(start: string, end: string) {
  const milliseconds = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(milliseconds / 86_400_000, 0);
}

function driverName(user: StaffUser) {
  return `${user.first_name} ${user.last_name}`.trim() || user.username;
}

function initials(user: StaffUser) {
  return `${user.first_name.slice(0, 1)}${user.last_name.slice(0, 1)}`.toUpperCase() || "R";
}

function normalizedName(value?: string | null) {
  return (value || "").trim().toLocaleLowerCase("es").replace(/\s+/g, " ");
}

function belongsToDriver(shipment: StaffAnalyticsShipment, user: StaffUser) {
  if (shipment.assigned_staff_id === user.id) return true;
  if (user.legacy_app_user_id && shipment.assigned_driver_id === user.legacy_app_user_id) return true;
  return Boolean(
    shipment.assigned_driver_name &&
    normalizedName(shipment.assigned_driver_name) === normalizedName(driverName(user))
  );
}

export default function StaffAnalyticsDashboard({
  users,
  shipments,
  trips,
  loading,
}: {
  users: StaffUser[];
  shipments: StaffAnalyticsShipment[];
  trips: StaffAnalyticsTrip[];
  loading: boolean;
}) {
  const [period, setPeriod] = useState<Period>("30");
  const [tripId, setTripId] = useState("ALL");
  const [referenceNow] = useState(() => Date.now());

  const filteredShipments = useMemo(() => {
    const drivers = users.filter((user) => user.role === "DELIVERY");
    const cutoff = period === "all"
      ? null
      : startOfDay(new Date(referenceNow - Number(period) * 86_400_000));

    return shipments.filter((shipment) => {
      if (tripId !== "ALL" && shipment.trip_id !== tripId) return false;
      if (cutoff && new Date(shipment.created_at) < cutoff) return false;
      return drivers.some((user) => belongsToDriver(shipment, user));
    });
  }, [period, referenceNow, shipments, tripId, users]);

  const stats = useMemo<DriverStats[]>(() => {
    const drivers = users.filter((user) => user.role === "DELIVERY");

    return drivers.map((user) => {
      const rows = filteredShipments.filter((shipment) => belongsToDriver(shipment, user));
      const deliveredRows = rows.filter((shipment) => shipment.status === "delivered" && shipment.delivered_date);
      const statusCounts: Record<StatusGroup, number> = {
        preparing: 0,
        transit: 0,
        delivery: 0,
        delivered: 0,
        issue: 0,
      };

      rows.forEach((shipment) => { statusCounts[groupStatus(shipment.status)] += 1; });

      const averageDays = deliveredRows.length
        ? deliveredRows.reduce(
            (sum, shipment) => sum + daysBetween(shipment.created_at, shipment.delivered_date!),
            0
          ) / deliveredRows.length
        : null;

      const weekly = Array.from({ length: 7 }, (_, index) => {
        const from = startOfDay(new Date(referenceNow - (6 - index) * 7 * 86_400_000));
        const to = new Date(from.getTime() + 7 * 86_400_000);
        return deliveredRows.filter((shipment) => {
          const date = new Date(shipment.delivered_date!);
          return date >= from && date < to;
        }).length;
      });

      return {
        user,
        total: rows.length,
        delivered: deliveredRows.length,
        averageDays,
        completionRate: rows.length ? Math.round((deliveredRows.length / rows.length) * 100) : 0,
        statusCounts,
        weekly,
      };
    }).sort((a, b) => b.total - a.total || b.delivered - a.delivered);
  }, [filteredShipments, referenceNow, users]);

  const deliveredShipments = filteredShipments.filter((shipment) => shipment.status === "delivered" && shipment.delivered_date);
  const averageDays = deliveredShipments.length
    ? deliveredShipments.reduce(
        (sum, shipment) => sum + daysBetween(shipment.created_at, shipment.delivered_date!),
        0
      ) / deliveredShipments.length
    : null;
  const completionRate = filteredShipments.length
    ? Math.round((deliveredShipments.length / filteredShipments.length) * 100)
    : 0;
  const maxTotal = Math.max(...stats.map((item) => item.total), 1);
  const ranked = stats
    .filter((item) => item.averageDays != null && item.delivered >= 3)
    .sort((a, b) => (a.averageDays ?? Infinity) - (b.averageDays ?? Infinity));
  const fallbackRanked = stats
    .filter((item) => item.averageDays != null)
    .sort((a, b) => (a.averageDays ?? Infinity) - (b.averageDays ?? Infinity));
  const ranking = ranked.length ? ranked : fallbackRanked;

  if (loading) {
    return <div className="flex min-h-80 items-center justify-center text-slate-500"><Activity className="mr-2 animate-pulse"/> Calculando estadísticas...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-end">
        <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none">
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="all">Todo el historial</option>
        </select>
        <select value={tripId} onChange={(event) => setTripId(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 outline-none">
          <option value="ALL">Todos los viajes</option>
          {trips.map((trip) => <option key={trip.id} value={trip.id}>Viaje {trip.trip_number} · {trip.name}</option>)}
        </select>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetric icon={<PackageCheck/>} label="Envíos asignados" value={filteredShipments.length.toLocaleString()} tone="blue"/>
        <AnalyticsMetric icon={<CheckCircle2/>} label="Completados" value={deliveredShipments.length.toLocaleString()} tone="emerald"/>
        <AnalyticsMetric icon={<Activity/>} label="Tasa de entrega" value={`${completionRate}%`} tone="violet"/>
        <AnalyticsMetric icon={<Timer/>} label="Tiempo promedio" value={averageDays == null ? "—" : `${averageDays.toFixed(1)} días`} tone="amber"/>
      </section>

      {stats.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <Activity className="mx-auto mb-3 text-slate-300" size={44}/>
          <p className="font-black text-slate-800">No hay repartidores para analizar</p>
        </div>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
            <div className="rounded-3xl border border-slate-200 p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div><h2 className="text-lg font-black text-slate-950">Envíos por repartidor y estado</h2><p className="mt-1 text-sm font-semibold text-slate-500">Distribución de la carga operativa actual.</p></div>
                <div className="flex flex-wrap gap-3">{statusGroups.map((group) => <span key={group.key} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600"><i className={`h-2.5 w-2.5 rounded-full ${group.color}`}/>{group.label}</span>)}</div>
              </div>
              <div className="space-y-4">
                {stats.map((item) => (
                  <div key={item.user.id} className="grid items-center gap-3 sm:grid-cols-[170px_1fr_42px]">
                    <div className="flex min-w-0 items-center gap-2.5"><Avatar user={item.user} size="sm"/><span className="truncate text-sm font-black text-slate-800">{driverName(item.user)}</span></div>
                    <div className="flex h-7 overflow-hidden rounded-lg bg-slate-100" title={`${item.total} envíos`}>
                      {statusGroups.map((group) => {
                        const count = item.statusCounts[group.key];
                        if (!count) return null;
                        return <div key={group.key} className={`grid min-w-[18px] place-items-center border-r border-white/60 text-[10px] font-black text-white ${group.color}`} style={{ width: `${(count / maxTotal) * 100}%` }}>{count}</div>;
                      })}
                    </div>
                    <span className="text-right text-sm font-black text-slate-700">{item.total}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-white via-amber-50/50 to-orange-50 p-5 md:p-6">
              <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.15em] text-amber-700">Rendimiento destacado</p><h2 className="mt-1 text-xl font-black text-slate-950">Repartidores más rápidos</h2></div><div className="rounded-2xl bg-amber-100 p-3 text-amber-600"><Trophy size={28}/></div></div>
              {ranking.length ? <div className="mt-6 space-y-3">{ranking.slice(0, 3).map((item, index) => <div key={item.user.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${index === 0 ? "border-amber-200 bg-white shadow-sm" : "border-white/80 bg-white/70"}`}><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${index === 0 ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span><Avatar user={item.user} size={index === 0 ? "lg" : "sm"}/><div className="min-w-0 flex-1"><p className="truncate font-black text-slate-900">{driverName(item.user)}</p><p className="text-xs font-bold text-blue-700">{item.averageDays?.toFixed(1)} días promedio</p></div><div className="text-right"><p className="font-black text-emerald-600">{item.delivered}</p><p className="text-[10px] font-bold text-slate-500">entregados</p></div></div>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-amber-200 bg-white/70 p-8 text-center text-sm font-bold text-slate-500"><Clock3 className="mx-auto mb-2 text-amber-400"/>Aún no hay entregas con fechas suficientes para calcular rapidez.</div>}
              <p className="mt-4 text-[11px] font-semibold leading-5 text-slate-500">El ranking usa el tiempo entre creación y entrega. Cuando hay suficientes datos, exige un mínimo de 3 entregas.</p>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {stats.map((item) => <DriverCard key={item.user.id} item={item}/>) }
          </section>
        </>
      )}
    </div>
  );
}

function AnalyticsMetric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "blue" | "emerald" | "violet" | "amber" }) {
  const tones = { blue: "bg-blue-50 text-blue-700", emerald: "bg-emerald-50 text-emerald-600", violet: "bg-violet-50 text-violet-600", amber: "bg-amber-50 text-amber-600" };
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><div className={`rounded-2xl p-3 ${tones[tone]}`}>{icon}</div><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div></div></div>;
}

function Avatar({ user, size }: { user: StaffUser; size: "sm" | "lg" }) {
  const classes = size === "lg" ? "h-14 w-14 rounded-2xl" : "h-9 w-9 rounded-xl";
  return user.photo_url
    ? <img src={user.photo_url} alt={driverName(user)} className={`${classes} shrink-0 object-cover ring-2 ring-white`}/>
    : <div className={`${classes} grid shrink-0 place-items-center bg-blue-100 text-xs font-black text-blue-700 ring-2 ring-white`}>{initials(user)}</div>;
}

function DriverCard({ item }: { item: DriverStats }) {
  const pending = item.total - item.delivered;
  return <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5"><Avatar user={item.user} size="lg"/><div className="min-w-0 flex-1"><h3 className="truncate text-lg font-black text-slate-950">{driverName(item.user)}</h3><p className="text-xs font-bold text-slate-500">{item.user.vehicle_type || "Vehículo no especificado"}{item.user.vehicle_plate ? ` · ${item.user.vehicle_plate}` : ""}</p></div><ProgressRing value={item.completionRate}/></div>
    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 py-4 text-center"><MiniStat label="Entregados" value={item.delivered} color="text-emerald-600"/><MiniStat label="En reparto" value={item.statusCounts.delivery} color="text-violet-600"/><MiniStat label="Pendientes" value={pending} color="text-orange-600"/></div>
    <div className="p-5"><div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-500"><span>Entregas por semana</span><span>{item.averageDays == null ? "Sin promedio" : `${item.averageDays.toFixed(1)} días prom.`}</span></div><Sparkline values={item.weekly}/><button type="button" className="mt-3 inline-flex w-full items-center justify-end gap-1 text-xs font-black text-blue-700">Ver rendimiento <ArrowUpRight size={14}/></button></div>
  </article>;
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div><p className={`text-xl font-black ${color}`}>{value}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p></div>;
}

function ProgressRing({ value }: { value: number }) {
  const normalized = Math.min(Math.max(value, 0), 100);
  return <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#10b981 ${normalized * 3.6}deg, #e2e8f0 0deg)` }}><div className="grid h-11 w-11 place-items-center rounded-full bg-white text-xs font-black text-slate-800">{normalized}%</div></div>;
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * 100},${34 - (value / max) * 28}`).join(" ");
  return <div className="rounded-xl bg-blue-50/50 px-2 py-2"><svg viewBox="0 0 100 38" className="h-12 w-full" preserveAspectRatio="none" aria-label="Tendencia semanal"><polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg><div className="flex justify-between text-[9px] font-bold text-slate-400"><span>-6</span><span>-5</span><span>-4</span><span>-3</span><span>-2</span><span>-1</span><span>Actual</span></div></div>;
}
