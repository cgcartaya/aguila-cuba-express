"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck2 } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import ReservationsList from "@/components/admin/reservas/ReservationsList";
import { getReservationsForAdmin } from "@/lib/services/reservas";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { Reservation, ReservationStatus } from "@/lib/reservas/types";

const STATUS_FILTERS: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "rejected", label: "Rechazadas" },
];

export default function AdminReservationsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [dateFilter, setDateFilter] = useState(""); // vacío = hoy en adelante
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (accessLoading || storeLoading) return;
    if (!activeStore?.id) {
      setReservations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await getReservationsForAdmin(activeStore.id, {
      date: dateFilter || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    });

    if (error) console.error("Error cargando reservas:", error);
    setReservations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading, dateFilter, statusFilter]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Reservas"
        title="Solicitudes"
        description="Confirma o rechaza las reservas que van llegando."
        storeName={activeStore?.name}
        icon={CalendarCheck2}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter("")}
            className="text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Limpiar fecha
          </button>
        )}

        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                statusFilter === f.value
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm font-bold text-slate-400">Cargando solicitudes...</p>
        ) : (
          <ReservationsList
            reservations={reservations}
            storeName={activeStore?.name || ""}
            onChange={loadData}
          />
        )}
      </div>
    </main>
  );
}
