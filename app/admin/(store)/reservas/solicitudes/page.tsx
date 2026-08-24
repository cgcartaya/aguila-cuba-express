"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { CalendarCheck2, Radio, WifiOff } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import ReservationsList from "@/components/admin/reservas/ReservationsList";
import { getReservationsForAdmin } from "@/lib/services/reservas";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { Reservation, ReservationStatus } from "@/lib/reservas/types";
import { supabase } from "@/lib/supabase";

const STATUS_FILTERS: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "rejected", label: "Rechazadas" },
];

const DATE_RANGES = [
  { value: "upcoming", label: "Próximas" },
  { value: "past", label: "Pasadas" },
  { value: "all", label: "Todas las fechas" },
] as const;
type DateRange = (typeof DATE_RANGES)[number]["value"];

export default function AdminReservationsPage() {
  const realtimeInstanceId = useId().replace(/:/g, "");
  const realtimeSequence = useRef(0);
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [dateFilter, setDateFilter] = useState(""); // vacío = hoy en adelante
  const [dateRange, setDateRange] = useState<DateRange>("upcoming");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [liveNotice, setLiveNotice] = useState("");

  const loadData = useCallback(async (showLoader = true) => {
    if (accessLoading || storeLoading) return;
    if (!activeStore?.id) {
      setReservations([]);
      setLoading(false);
      return;
    }

    if (showLoader) setLoading(true);
    setLoadError("");
    const { data, error } = await getReservationsForAdmin(activeStore.id, {
      date: dateFilter || undefined,
      range: dateRange,
      status: statusFilter === "all" ? undefined : statusFilter,
    });

    if (error) {
      console.error("Error cargando reservas:", error);
      setLoadError("No se pudieron cargar las reservas. Intenta nuevamente.");
    }
    setReservations(data || []);
    setLoading(false);
  }, [accessLoading, activeStore?.id, dateFilter, dateRange, statusFilter, storeLoading]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!activeStore?.id) return;

    let refreshTimer: number | undefined;
    let noticeTimer: number | undefined;
    realtimeSequence.current += 1;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      channel = supabase
        .channel(`store:${activeStore.id}:reservations:${realtimeInstanceId}:${realtimeSequence.current}`)
        .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
          filter: `store_id=eq.${activeStore.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLiveNotice("Nueva solicitud de reserva recibida.");
            if (noticeTimer) window.clearTimeout(noticeTimer);
            noticeTimer = window.setTimeout(() => setLiveNotice(""), 5000);
          }
          if (refreshTimer) window.clearTimeout(refreshTimer);
          refreshTimer = window.setTimeout(() => void loadData(false), 250);
        }
        )
        .subscribe((status) => {
          setRealtimeConnected(status === "SUBSCRIBED");
        });
    } catch (error) {
      console.warn("No se pudo iniciar la actualización automática de reservas:", error);
      setRealtimeConnected(false);
    }

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      if (noticeTimer) window.clearTimeout(noticeTimer);
      setRealtimeConnected(false);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [activeStore?.id, loadData, realtimeInstanceId]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Reservas"
        title="Solicitudes"
        description="Confirma o rechaza las reservas que van llegando."
        storeName={activeStore?.name}
        icon={CalendarCheck2}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black ${realtimeConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {realtimeConnected ? <Radio size={12} /> : <WifiOff size={12} />}
          {realtimeConnected ? "Actualización automática activa" : "Conectando actualización automática…"}
        </span>
        {liveNotice && <span className="rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-black text-white shadow-sm">{liveNotice}</span>}
      </div>

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

        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => { setDateRange(range.value); setDateFilter(""); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                !dateFilter && dateRange === range.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

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
        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{loadError}</div>
        ) : loading ? (
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
