"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  CalendarCheck2,
  CalendarOff,
  CalendarRange,
  Clock3,
  LayoutDashboard,
  MapPinned,
  Sparkles,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import TableManager from "@/components/admin/reservas/TableManager";
import SlotManager from "@/components/admin/reservas/SlotManager";
import BlockedDatesManager from "@/components/admin/reservas/BlockedDatesManager";
import {
  getBlockedDatesForAdmin,
  getReservationSlotsForAdmin,
  getReservationTablesForAdmin,
} from "@/lib/services/reservas";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { usePendingReservationsCount } from "@/hooks/usePendingReservationsCount";
import type {
  BlockedDate,
  ReservationSlot,
  ReservationTable,
} from "@/lib/reservas/types";

type TabKey = "mesas" | "franjas" | "bloqueadas";

const TABS: { key: TabKey; label: string; icon: typeof Armchair }[] = [
  { key: "mesas", label: "Espacios y mesas", icon: Armchair },
  { key: "franjas", label: "Horarios", icon: Clock3 },
  { key: "bloqueadas", label: "Fechas bloqueadas", icon: CalendarOff },
];

export default function AdminReservasPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [tab, setTab] = useState<TabKey>("mesas");
  const [tables, setTables] = useState<ReservationTable[]>([]);
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);

  const pendingCount = usePendingReservationsCount(activeStore?.id);

  const loadData = async () => {
    if (accessLoading || storeLoading) return;

    if (!activeStore?.id) {
      setTables([]);
      setSlots([]);
      setBlockedDates([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [
      { data: tablesData, error: tablesError },
      { data: slotsData, error: slotsError },
      { data: blockedData, error: blockedError },
    ] = await Promise.all([
      getReservationTablesForAdmin(activeStore.id),
      getReservationSlotsForAdmin(activeStore.id),
      getBlockedDatesForAdmin(activeStore.id),
    ]);

    if (tablesError) console.error("Error cargando mesas:", tablesError);
    if (slotsError) console.error("Error cargando franjas:", slotsError);
    if (blockedError) console.error("Error cargando fechas bloqueadas:", blockedError);

    setTables((tablesData as ReservationTable[]) || []);
    setSlots((slotsData as ReservationSlot[]) || []);
    setBlockedDates(blockedData || []);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading]);

  if (accessLoading || storeLoading || loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center bg-[#F7F9FC] px-4">
        <p className="text-sm font-bold text-slate-400">Cargando reservas...</p>
      </main>
    );
  }

  if (!activeStore?.id) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center bg-[#F7F9FC] px-4">
        <p className="text-sm font-bold text-slate-400">
          Selecciona una tienda para configurar sus reservas.
        </p>
      </main>
    );
  }

  const activeTables = tables.filter((table) => table.is_active).length;
  const zones = Array.from(
    new Set(
      tables
        .map((table) => (table.zone || "").trim())
        .filter(Boolean)
    )
  );

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-6">
      <div className="mx-auto max-w-[1240px]">
        <AdminPageHeader
          eyebrow="Reservas"
          title="Reservas y espacios"
          description="Organiza las mesas, horarios y disponibilidad que verán tus clientes al reservar."
          storeName={activeStore?.name}
          icon={Armchair}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/reservas/calendario"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CalendarRange size={16} />
                Calendario
              </Link>

              <Link
                href="/admin/reservas/solicitudes"
                className="relative inline-flex items-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <CalendarCheck2 size={16} />
                Solicitudes
                {pendingCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-black">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </Link>
            </div>
          }
        />

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Armchair,
              label: "Mesas",
              value: tables.length,
              note: `${activeTables} visibles`,
              tone: "bg-orange-100 text-orange-600",
            },
            {
              icon: MapPinned,
              label: "Zonas actuales",
              value: zones.length,
              note: zones.length ? zones.join(" · ") : "Sin zonas definidas",
              tone: "bg-violet-100 text-violet-600",
            },
            {
              icon: Clock3,
              label: "Horarios",
              value: slots.length,
              note: "Franjas configuradas",
              tone: "bg-emerald-100 text-emerald-600",
            },
            {
              icon: CalendarCheck2,
              label: "Pendientes",
              value: pendingCount,
              note: "Solicitudes por revisar",
              tone: "bg-blue-100 text-blue-600",
            },
          ].map(({ icon: Icon, label, value, note, tone }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,.04)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}
                >
                  <Icon size={21} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  <p className="text-2xl font-black text-[#071B35]">{value}</p>
                </div>
              </div>
              <p className="mt-2 truncate text-[11px] font-semibold text-slate-400">
                {note}
              </p>
            </div>
          ))}
        </section>

        <div className="mt-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-sm">
          {TABS.map(({ key, label, icon: Icon }) => {
            const count =
              key === "mesas"
                ? tables.length
                : key === "franjas"
                ? slots.length
                : blockedDates.length;

            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${
                  tab === key
                    ? "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <Icon size={15} />
                {label}
                {count > 0 && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          {tab === "mesas" && (
            <TableManager
              storeId={activeStore.id}
              tables={tables}
              onChange={loadData}
            />
          )}

          {tab === "franjas" && (
            <SlotManager
              storeId={activeStore.id}
              slots={slots}
              onChange={loadData}
            />
          )}

          {tab === "bloqueadas" && (
            <BlockedDatesManager
              storeId={activeStore.id}
              blockedDates={blockedDates}
              onChange={loadData}
            />
          )}
        </div>

        <section className="mt-5 rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-black text-[#071B35]">
                Próxima evolución: espacios reales
              </h3>
              <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-500">
                En la siguiente fase convertiremos las zonas actuales en espacios
                reales del restaurante: Salón principal, Terraza, Segundo piso,
                Patio o Bar. Cada espacio podrá tener su propio plano visual.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
