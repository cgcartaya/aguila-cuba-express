"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CircleDollarSign, Loader2, Package, Plus, Route, Scale, Truck } from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getShippingTripsWithStats } from "@/lib/services/shipping-trips";
import { getShippingTripStatusLabel, type ShippingTripWithStats } from "@/lib/shipping/types";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-US", { dateStyle: "medium" }).format(new Date(value));
}

function statusClass(status: string) {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "in_transit") return "bg-blue-100 text-blue-700";
  if (status === "received_cuba" || status === "in_delivery") return "bg-violet-100 text-violet-700";
  if (status === "cancelled") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

export default function ShippingTripsPage() {
  const { access, isSuperAdmin, store: accessStore, loading: accessLoading } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(() => (isSuperAdmin ? selectedStore || accessStore : accessStore), [accessStore, isSuperAdmin, selectedStore]);

  const [trips, setTrips] = useState<ShippingTripWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canManage = access?.isSuperAdmin || ["OWNER", "ADMIN", "OPERATIONS"].includes(access?.storeMembership?.role || "");

  useEffect(() => {
    async function load() {
      if (!activeStore?.id) return setLoading(false);
      setLoading(true);
      setError("");
      const result = await getShippingTripsWithStats(activeStore.id);
      if (result.error) setError(result.error.message || "No se pudieron cargar los viajes.");
      setTrips(result.data || []);
      setLoading(false);
    }
    if (!accessLoading && !storeLoading) void load();
  }, [accessLoading, activeStore?.id, storeLoading]);

  if (loading || accessLoading || storeLoading) {
    return <main className="flex min-h-[60vh] items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-700" size={34} /></main>;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-28 md:p-7">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#0a2d63] to-[#1554a6] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-blue-100"><Route size={15} /> Operación por viajes</div>
              <h1 className="mt-4 text-3xl font-black md:text-4xl">Viajes de envíos</h1>
              <p className="mt-2 max-w-2xl text-blue-100/80">Cada viaje conserva su lista de paquetes, estados, cobros y estadísticas.</p>
            </div>
            {canManage && <Link href="/admin/shipping/trips/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#061b3a] shadow-lg"><Plus size={19} /> Crear viaje</Link>}
          </div>
        </header>

        {error && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{error}</div>}

        {trips.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <Truck className="mx-auto text-slate-300" size={52} />
            <h2 className="mt-4 text-2xl font-black text-slate-900">Todavía no hay viajes</h2>
            <p className="mt-2 text-slate-500">Crea el primer viaje para comenzar a registrar sus envíos.</p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {trips.map((trip) => (
              <Link key={trip.id} href={`/admin/shipping/trips/${trip.id}`} className="group rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Viaje {trip.trip_number}</p>
                    <h2 className="mt-1 text-2xl font-black text-[#061b3a]">{trip.name}</h2>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{trip.origin || "Origen sin definir"} → {trip.destination || "Destino sin definir"}</p>
                  </div>
                  <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${statusClass(trip.status)}`}>{getShippingTripStatusLabel(trip.status)}</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Metric icon={<Package size={17} />} label="Envíos" value={trip.stats.total_shipments.toString()} />
                  <Metric icon={<Scale size={17} />} label="Libras" value={trip.stats.total_weight_lb.toFixed(1)} />
                  <Metric icon={<CircleDollarSign size={17} />} label="Facturado" value={currency(trip.stats.billed_total)} />
                  <Metric icon={<CalendarDays size={17} />} label="Salida" value={formatDate(trip.departure_date)} />
                </div>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">{trip.stats.delivered_shipments} entregados</span>
                  <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">{trip.stats.pending_shipments} pendientes</span>
                  <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700">{trip.stats.issue_shipments} incidencias</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-[11px] font-black uppercase">{label}</span></div><p className="mt-2 truncate font-black text-slate-900">{value}</p></div>;
}
