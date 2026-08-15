"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Armchair, CalendarCheck2, CalendarOff, CalendarRange, Clock3 } from "lucide-react";

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
import type { BlockedDate, ReservationSlot, ReservationTable } from "@/lib/reservas/types";

type TabKey = "mesas" | "franjas" | "bloqueadas";

const TABS: { key: TabKey; label: string; icon: typeof Armchair }[] = [
  { key: "mesas", label: "Mesas", icon: Armchair },
  { key: "franjas", label: "Franjas horarias", icon: Clock3 },
  { key: "bloqueadas", label: "Fechas bloqueadas", icon: CalendarOff },
];

export default function AdminReservasPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
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
      <main className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm font-bold text-slate-400">Cargando reservas...</p>
      </main>
    );
  }

  if (!activeStore?.id) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm font-bold text-slate-400">
          Selecciona una tienda para configurar sus reservas.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Reservas"
        title="Configuración"
        description="El croquis, los horarios y las fechas que verán tus clientes al reservar."
        storeName={activeStore?.name}
        icon={Armchair}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/reservas/calendario"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
            >
              <CalendarRange size={16} />
              Calendario semanal
            </Link>
            <Link
              href="/admin/reservas/solicitudes"
              className="relative inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
            >
              <CalendarCheck2 size={16} />
              Ver solicitudes
              {pendingCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-black">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </Link>
          </div>
        }
      />

      <div className="mt-6 flex gap-1.5 overflow-x-auto rounded-2xl bg-slate-100 p-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              tab === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={15} />
            {label}
            {key === "mesas" && tables.length > 0 && (
              <span className="text-slate-400">({tables.length})</span>
            )}
            {key === "franjas" && slots.length > 0 && (
              <span className="text-slate-400">({slots.length})</span>
            )}
            {key === "bloqueadas" && blockedDates.length > 0 && (
              <span className="text-slate-400">({blockedDates.length})</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "mesas" && <TableManager storeId={activeStore.id} tables={tables} onChange={loadData} />}
        {tab === "franjas" && <SlotManager storeId={activeStore.id} slots={slots} onChange={loadData} />}
        {tab === "bloqueadas" && (
          <BlockedDatesManager storeId={activeStore.id} blockedDates={blockedDates} onChange={loadData} />
        )}
      </div>
    </main>
  );
}
