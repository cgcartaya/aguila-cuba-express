"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Armchair, CalendarCheck2, CalendarRange } from "lucide-react";

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

export default function AdminReservasPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

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
        title="Mesas y franjas horarias"
        description="Configura el croquis y los horarios que verán tus clientes al reservar."
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

      <div className="mt-6 space-y-5">
        <TableManager storeId={activeStore.id} tables={tables} onChange={loadData} />
        <SlotManager storeId={activeStore.id} slots={slots} onChange={loadData} />
        <BlockedDatesManager storeId={activeStore.id} blockedDates={blockedDates} onChange={loadData} />
      </div>
    </main>
  );
}
