"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Route,
  Trash2,
  Truck,
  XCircle,
} from "lucide-react";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  getPickupRoutes,
  managePickupRoute,
} from "@/lib/services/pickups";
import {
  PICKUP_ROUTE_STATUS_LABELS,
  type PickupRoute,
  type PickupRouteStatus,
} from "@/lib/pickups/types";

type Filter = "all" | PickupRouteStatus;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "draft", label: "Borradores" },
  { value: "published", label: "Publicadas" },
  { value: "in_progress", label: "En recorrido" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
];

export default function PickupRoutesPage() {
  const { store: selectedStore, loading: storeLoading } = useStore() as any;
  const { store: accessStore, isSuperAdmin, loading: accessLoading } =
    useAdminAccess();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;

  const [routes, setRoutes] = useState<PickupRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");

  async function load() {
    if (!store?.id) return;
    setLoading(true);
    const { data, error: queryError } = await getPickupRoutes(store.id);
    setRoutes(data);
    setError(queryError?.message || "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [store?.id]);

  const filteredRoutes = useMemo(
    () =>
      filter === "all"
        ? routes
        : routes.filter((route) => route.status === filter),
    [routes, filter]
  );

  const metrics = useMemo(
    () => ({
      upcoming: routes.filter(
        (item) =>
          item.route_date >= new Date().toISOString().slice(0, 10) &&
          !["cancelled", "completed"].includes(item.status)
      ).length,
      published: routes.filter((item) => item.status === "published").length,
      completed: routes.filter((item) => item.status === "completed").length,
      stops: routes.reduce(
        (sum, item) => sum + (item.stops?.length || 0),
        0
      ),
    }),
    [routes]
  );

  async function runAction(
    route: PickupRoute,
    action: "cancel" | "delete" | "complete" | "duplicate"
  ) {
    if (!store?.id) return;

    const prompts: Record<typeof action, string> = {
      cancel:
        "¿Cancelar esta ruta? Las solicitudes no recogidas volverán a Pendientes.",
      delete:
        "¿Eliminar esta ruta? Las solicitudes no recogidas volverán a Pendientes.",
      complete:
        "¿Marcar esta ruta como completada? Todas las paradas deben estar cerradas.",
      duplicate:
        "¿Duplicar la estructura de esta ruta como un nuevo borrador?",
    };

    if (!confirm(prompts[action])) return;

    setBusyId(route.id);
    setError("");

    const result = await managePickupRoute({
      storeId: store.id,
      routeId: route.id,
      action,
    });

    setBusyId("");

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (action === "duplicate" && result.data?.duplicated_route_id) {
      window.location.href = `/admin/pickups/routes/${result.data.duplicated_route_id}`;
      return;
    }

    await load();
  }

  if (loading || accessLoading || storeLoading) {
    return (
      <div className="rounded-[2rem] border bg-white p-12 text-center font-bold text-slate-500">
        <Loader2 className="mx-auto mb-3 animate-spin" />
        Cargando rutas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] bg-[#071d43] p-6 text-white sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-blue-200">
              Planificador operativo
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Rutas de recogida
            </h1>
            <p className="mt-3 max-w-2xl text-blue-100/75">
              Edita, duplica, cancela y cierra rutas sin perder el historial de
              las solicitudes.
            </p>
          </div>

          <Link
            href="/admin/pickups/routes/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#071d43]"
          >
            <Plus size={18} /> Crear ruta
          </Link>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<CalendarDays size={18} />}
            label="Próximas"
            value={metrics.upcoming}
          />
          <Metric
            icon={<MapPin size={18} />}
            label="Publicadas"
            value={metrics.published}
          />
          <Metric
            icon={<CheckCircle2 size={18} />}
            label="Completadas"
            value={metrics.completed}
          />
          <Metric
            icon={<Truck size={18} />}
            label="Paradas"
            value={metrics.stops}
          />
        </div>
      </header>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const count =
              item.value === "all"
                ? routes.length
                : routes.filter((route) => route.status === item.value).length;

            return (
              <button
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                  filter === item.value
                    ? "bg-[#071d43] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label} ({count})
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">
          {error}
        </div>
      )}

      {filteredRoutes.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center">
          <Route className="mx-auto text-slate-300" size={48} />
          <h2 className="mt-4 text-xl font-black">
            No hay rutas en esta sección
          </h2>
          <p className="mt-2 text-slate-500">
            Cambia el filtro o crea una nueva ruta.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredRoutes.map((route) => {
            const busy = busyId === route.id;
            const pickedUp =
              route.stops?.filter((stop) => stop.status === "picked_up")
                .length || 0;

            return (
              <article
                key={route.id}
                className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {PICKUP_ROUTE_STATUS_LABELS[route.status]}
                    </span>
                    <h2 className="mt-3 text-xl font-black">{route.name}</h2>
                    <p className="mt-1 font-bold text-slate-500">
                      {formatDate(route.route_date)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center">
                    <p className="text-2xl font-black">
                      {route.stops?.length || 0}
                    </p>
                    <p className="text-xs font-bold text-slate-500">paradas</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Info
                    label="Conductor"
                    value={route.driver_name || "Sin asignar"}
                  />
                  <Info
                    label="Vehículo"
                    value={route.vehicle_name || "Sin asignar"}
                  />
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm font-black">
                    <span>Progreso</span>
                    <span>
                      {pickedUp}/{route.stops?.length || 0}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${
                          route.stops?.length
                            ? Math.round(
                                (pickedUp / route.stops.length) * 100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {route.is_public && (
                  <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                    Visible en el landing
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link
                    href={`/admin/pickups/routes/${route.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#071d43] px-4 py-2.5 text-sm font-black text-white"
                  >
                    <Eye size={16} /> Abrir / editar
                  </Link>

                  <button
                    onClick={() => runAction(route, "duplicate")}
                    disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-black disabled:opacity-50"
                  >
                    <Copy size={16} /> Duplicar
                  </button>

                  {route.status !== "completed" &&
                    route.status !== "cancelled" && (
                      <button
                        onClick={() => runAction(route, "cancel")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-black text-amber-700 disabled:opacity-50"
                      >
                        <XCircle size={16} /> Cancelar
                      </button>
                    )}

                  {route.status !== "completed" &&
                    route.status !== "cancelled" && (
                      <button
                        onClick={() => runAction(route, "complete")}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-black text-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={16} /> Completar
                      </button>
                    )}

                  {route.status !== "in_progress" &&
                    route.status !== "completed" && (
                      <button
                        onClick={() => runAction(route, "delete")}
                        disabled={busy}
                        className="ml-auto inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-black text-red-700 disabled:opacity-50"
                      >
                        {busy ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                        Eliminar
                      </button>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-blue-200">
        {icon}
        <span className="text-xs font-black uppercase">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 font-black text-slate-800">{value}</p>
    </div>
  );
}
