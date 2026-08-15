"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight, Users } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { getReservationSlotsForAdmin, getReservationsForWeek } from "@/lib/services/reservas";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { ReservationSlot } from "@/lib/reservas/types";

type WeekCell = { count: number; people: number };
type WeekRow = { slotId: string; label: string; startTime: string; days: WeekCell[] };

function toISO(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfWeek(reference: Date) {
  const date = new Date(reference);
  const day = date.getDay(); // 0=domingo
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("es", { weekday: "short", day: "numeric" });
}

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function AdminReservasCalendarioPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [loading, setLoading] = useState(true);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i)), [weekAnchor]);

  const loadData = async () => {
    if (accessLoading || storeLoading || !activeStore?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const startDate = toISO(weekDays[0]);
    const endDate = toISO(weekDays[6]);

    const [{ data: slotsData }, { data: reservationsData, error: reservationsError }] = await Promise.all([
      getReservationSlotsForAdmin(activeStore.id),
      getReservationsForWeek(activeStore.id, startDate, endDate),
    ]);

    if (reservationsError) console.error("Error cargando calendario:", reservationsError);

    const activeSlots = ((slotsData as ReservationSlot[]) || []).filter((s) => s.is_active);
    setSlots(activeSlots);

    const dayKeys = weekDays.map(toISO);
    const nextRows: WeekRow[] = activeSlots.map((slot) => ({
      slotId: slot.id,
      label: slot.label,
      startTime: slot.start_time,
      days: dayKeys.map(() => ({ count: 0, people: 0 })),
    }));

    (reservationsData || []).forEach((r) => {
      const rowIndex = nextRows.findIndex((row) => row.slotId === r.slot_id);
      const colIndex = dayKeys.indexOf(r.reservation_date);
      if (rowIndex === -1 || colIndex === -1) return;
      nextRows[rowIndex].days[colIndex].count += 1;
      nextRows[rowIndex].days[colIndex].people += r.party_size;
    });

    setRows(nextRows);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading, weekAnchor]);

  const totalPeopleThisWeek = rows.reduce(
    (sum, row) => sum + row.days.reduce((s, d) => s + d.people, 0),
    0
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Reservas"
        title="Calendario semanal"
        description="Cuántas reservas hay por día y franja, de un vistazo."
        storeName={activeStore?.name}
        icon={CalendarRange}
      />

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekAnchor((prev) => addDays(prev, -7))}
            className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-black text-slate-700">
            {formatDayLabel(weekDays[0])} — {formatDayLabel(weekDays[6])}
          </p>
          <button
            onClick={() => setWeekAnchor((prev) => addDays(prev, 7))}
            className="rounded-lg bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <p className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Users size={14} /> {totalPeopleThisWeek} personas esta semana
        </p>
      </div>

      {loading ? (
        <p className="mt-6 text-sm font-bold text-slate-400">Cargando...</p>
      ) : slots.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
          Configura franjas horarias para ver el calendario.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-3xl bg-white shadow-sm">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                  Franja
                </th>
                {weekDays.map((day) => (
                  <th
                    key={toISO(day)}
                    className="px-4 py-3 text-center text-xs font-black uppercase tracking-wide text-slate-400"
                  >
                    {formatDayLabel(day)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slotId} className="border-t border-slate-100">
                  <td className="sticky left-0 bg-white px-4 py-3 text-xs font-bold text-slate-700">
                    {formatTime(row.startTime)}
                  </td>
                  {row.days.map((cell, i) => (
                    <td key={i} className="px-4 py-3 text-center">
                      {cell.count > 0 ? (
                        <div className="inline-flex flex-col items-center rounded-xl bg-slate-50 px-2.5 py-1.5">
                          <span className="text-sm font-black text-slate-900">{cell.count}</span>
                          <span className="text-[10px] font-bold text-slate-400">{cell.people} pers.</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-300">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
