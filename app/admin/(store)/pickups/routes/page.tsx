"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, MapPin, Plus, Route, Truck } from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { getPickupRoutes } from "@/lib/services/pickups";
import { PICKUP_ROUTE_STATUS_LABELS, type PickupRoute } from "@/lib/pickups/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${value}T12:00:00`));
}

export default function PickupRoutesPage() {
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const [routes, setRoutes] = useState<PickupRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!store?.id) return;
    setLoading(true);
    getPickupRoutes(store.id).then(({ data, error: queryError }) => {
      setRoutes(data);
      setError(queryError?.message || "");
      setLoading(false);
    });
  }, [store?.id]);

  const metrics = useMemo(() => ({
    upcoming: routes.filter((item) => item.route_date >= new Date().toISOString().slice(0, 10) && item.status !== "cancelled").length,
    published: routes.filter((item) => item.status === "published").length,
    stops: routes.reduce((sum, item) => sum + (item.stops?.length || 0), 0),
  }), [routes]);

  if (loading || accessLoading || storeLoading) {
    return <div className="rounded-[2rem] border bg-white p-12 text-center font-bold text-slate-500"><Loader2 className="mx-auto mb-3 animate-spin" />Cargando rutas...</div>;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] bg-[#071d43] p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">Planificador operativo</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">Rutas de recogida</h1><p className="mt-3 max-w-2xl text-blue-100/75">Agrupa solicitudes por fecha, ordena las paradas y publica las próximas ciudades en el landing.</p></div>
          <Link href="/admin/pickups/routes/new" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#071d43]"><Plus size={18} /> Crear ruta</Link>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Metric icon={<CalendarDays size={18} />} label="Próximas" value={metrics.upcoming} />
          <Metric icon={<MapPin size={18} />} label="Publicadas" value={metrics.published} />
          <Metric icon={<Truck size={18} />} label="Paradas" value={metrics.stops} />
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</div>}

      {routes.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center"><Route className="mx-auto text-slate-300" size={48} /><h2 className="mt-4 text-xl font-black">Todavía no hay rutas</h2><p className="mt-2 text-slate-500">Selecciona solicitudes y crea la primera ruta de recogida.</p></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {routes.map((route) => (
            <Link key={route.id} href={`/admin/pickups/routes/${route.id}`} className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-4"><div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{PICKUP_ROUTE_STATUS_LABELS[route.status]}</span><h2 className="mt-3 text-xl font-black">{route.name}</h2><p className="mt-1 font-bold text-slate-500">{formatDate(route.route_date)}</p></div><div className="rounded-2xl bg-slate-100 px-4 py-3 text-center"><p className="text-2xl font-black">{route.stops?.length || 0}</p><p className="text-xs font-bold text-slate-500">paradas</p></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Conductor" value={route.driver_name || "Sin asignar"} /><Info label="Vehículo" value={route.vehicle_name || "Sin asignar"} /></div>
              {route.is_public && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">Visible en el landing</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><div className="flex items-center gap-2 text-blue-200">{icon}<span className="text-xs font-black uppercase">{label}</span></div><p className="mt-2 text-3xl font-black">{value}</p></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 font-black text-slate-800">{value}</p></div>; }
