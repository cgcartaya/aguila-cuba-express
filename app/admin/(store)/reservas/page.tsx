"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  Building2,
  CalendarCheck2,
  CalendarOff,
  CalendarRange,
  Clock3,
  Sparkles,
} from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import SpaceManager from "@/components/admin/reservas/SpaceManager";
import TableManager from "@/components/admin/reservas/TableManager";
import SlotManager from "@/components/admin/reservas/SlotManager";
import BlockedDatesManager from "@/components/admin/reservas/BlockedDatesManager";
import {
  getBlockedDatesForAdmin,
  getReservationSlotsForAdmin,
  getReservationSpaceElementsForAdmin,
  getReservationSpacesForAdmin,
  getReservationTablesForAdmin,
} from "@/lib/services/reservas";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { usePendingReservationsCount } from "@/hooks/usePendingReservationsCount";
import type {
  BlockedDate,
  ReservationSlot,
  ReservationSpace,
  ReservationSpaceElement,
  ReservationTable,
} from "@/lib/reservas/types";

type TabKey = "espacios" | "mesas" | "franjas" | "bloqueadas";

const TABS = [
  { key: "espacios" as const, label: "Espacios", icon: Building2 },
  { key: "mesas" as const, label: "Mesas", icon: Armchair },
  { key: "franjas" as const, label: "Horarios", icon: Clock3 },
  { key: "bloqueadas" as const, label: "Fechas bloqueadas", icon: CalendarOff },
];

export default function AdminReservasPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

  const [tab, setTab] = useState<TabKey>("espacios");
  const [spaces, setSpaces] = useState<ReservationSpace[]>([]);
  const [tables, setTables] = useState<ReservationTable[]>([]);
  const [elements, setElements] = useState<ReservationSpaceElement[]>([]);
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const pendingCount = usePendingReservationsCount(activeStore?.id);

  const loadData = async (silent = false) => {
    if (accessLoading || storeLoading) return;
    if (!activeStore?.id) {
      setSpaces([]); setTables([]); setElements([]); setSlots([]); setBlockedDates([]); setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    const [
      { data: spacesData },
      { data: tablesData },
      { data: elementsData },
      { data: slotsData },
      { data: blockedData },
    ] = await Promise.all([
      getReservationSpacesForAdmin(activeStore.id),
      getReservationTablesForAdmin(activeStore.id),
      getReservationSpaceElementsForAdmin(activeStore.id),
      getReservationSlotsForAdmin(activeStore.id),
      getBlockedDatesForAdmin(activeStore.id),
    ]);

    setSpaces((spacesData as ReservationSpace[]) || []);
    setTables((tablesData as ReservationTable[]) || []);
    setElements((elementsData as ReservationSpaceElement[]) || []);
    setSlots((slotsData as ReservationSlot[]) || []);
    setBlockedDates(blockedData || []);
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStore?.id, accessLoading, storeLoading]);

  if (accessLoading || storeLoading || loading) {
    return <main className="flex min-h-[50vh] items-center justify-center bg-[#F7F9FC]"><p className="text-sm font-bold text-slate-400">Cargando reservas...</p></main>;
  }

  if (!activeStore?.id) {
    return <main className="p-8 text-center text-slate-400">Selecciona una tienda.</main>;
  }

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 py-6">
      <div className="mx-auto max-w-[1240px]">
        <AdminPageHeader
          eyebrow="Reservas"
          title="Reservas y espacios"
          description="Construye las áreas reales del restaurante y organiza dentro de ellas tus mesas y horarios."
          storeName={activeStore.name}
          icon={Armchair}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/reservas/calendario" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm">
                <CalendarRange size={16}/> Calendario
              </Link>
              <Link href="/admin/reservas/solicitudes" className="relative inline-flex items-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-sm font-black text-white shadow-sm">
                <CalendarCheck2 size={16}/> Solicitudes
                {pendingCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px]">{pendingCount > 99 ? "99+" : pendingCount}</span>}
              </Link>
            </div>
          }
        />

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Espacios", spaces.length, "Áreas reales", "bg-violet-100 text-violet-600", Building2],
            ["Mesas", tables.length, `${tables.filter(t=>t.is_active).length} visibles`, "bg-orange-100 text-orange-600", Armchair],
            ["Horarios", slots.length, "Franjas configuradas", "bg-emerald-100 text-emerald-600", Clock3],
            ["Pendientes", pendingCount, "Solicitudes por revisar", "bg-blue-100 text-blue-600", CalendarCheck2],
          ].map(([label,value,note,tone,Icon]: any) => (
            <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,.04)]">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon size={21}/></div>
                <div><p className="text-xs font-bold text-slate-500">{label}</p><p className="text-2xl font-black text-[#071B35]">{value}</p></div>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-400">{note}</p>
            </div>
          ))}
        </section>

        <div className="mt-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200/70 bg-white p-1.5 shadow-sm">
          {TABS.map(({key,label,icon:Icon}) => {
            const count = key==="espacios" ? spaces.length : key==="mesas" ? tables.length : key==="franjas" ? slots.length : blockedDates.length;
            return <button key={key} onClick={()=>setTab(key)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black ${tab===key?"bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-100":"text-slate-500 hover:bg-slate-50"}`}>
              <Icon size={15}/>{label}{count>0&&<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-400">{count}</span>}
            </button>;
          })}
        </div>

        <div className="mt-5">
          {tab==="espacios" && <SpaceManager storeId={activeStore.id} spaces={spaces} tables={tables} elements={elements} onChange={() => void loadData(true)}/>}
          {tab==="mesas" && <TableManager storeId={activeStore.id} spaces={spaces} tables={tables} onChange={() => void loadData(true)}/>}
          {tab==="franjas" && <SlotManager storeId={activeStore.id} slots={slots} onChange={() => void loadData(true)}/>}
          {tab==="bloqueadas" && <BlockedDatesManager storeId={activeStore.id} blockedDates={blockedDates} onChange={() => void loadData(true)}/>}
        </div>

        <section className="mt-5 rounded-3xl border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-5">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600"><Sparkles size={18}/></div>
            <div>
              <h3 className="font-black text-[#071B35]">La ubicación ya tiene sentido real</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Cada mesa pertenece ahora a un espacio concreto. La próxima fase será el editor de plano visual dentro de cada espacio.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
