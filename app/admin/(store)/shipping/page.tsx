"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CalendarDays,
  CircleAlert,
  Clock3,
  DollarSign,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  Scale,
  Settings2,
  Truck,
  UserRoundX,
  WalletCards,
} from "lucide-react";

import DriverPerformance from "@/components/admin/shipping/dashboard/DriverPerformance";
import OperationalMetricCard from "@/components/admin/shipping/dashboard/OperationalMetricCard";
import RecentShipments from "@/components/admin/shipping/dashboard/RecentShipments";
import SevenDayActivity from "@/components/admin/shipping/dashboard/SevenDayActivity";
import StatusOverview from "@/components/admin/shipping/dashboard/StatusOverview";
import TopDestinations from "@/components/admin/shipping/dashboard/TopDestinations";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getShippingDashboard } from "@/lib/services/shipping-dashboard";
import type { ShippingDashboardData } from "@/lib/shipping/dashboard-types";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

const emptyDashboard: ShippingDashboardData = {
  summary: {
    total_active: 0,
    created_today: 0,
    created_this_week: 0,
    pending_total: 0,
    delivered_total: 0,
    delivered_today: 0,
    issues_total: 0,
    in_transit_total: 0,
    received_cuba_total: 0,
    out_for_delivery_total: 0,
    unassigned_total: 0,
    billed_today: 0,
    billed_this_month: 0,
    outstanding_total: 0,
    paid_total: 0,
    weight_today_lb: 0,
    weight_this_month_lb: 0,
    money_sent_today: 0,
    money_sent_this_month: 0,
  },
  statuses: [],
  last_7_days: [],
  top_destinations: [],
  drivers: [],
  recent_shipments: [],
};

export default function ShippingOperationalDashboardPage() {
  const {
    access,
    loading: accessLoading,
    isSuperAdmin,
    store: accessStore,
  } = useAdminAccess();

  const {
    store: selectedStore,
    loading: storeLoading,
  } = useStore();

  const activeStore = useMemo(
    () =>
      isSuperAdmin
        ? selectedStore || accessStore
        : accessStore,
    [accessStore, isSuperAdmin, selectedStore]
  );

  const [dashboard, setDashboard] =
    useState<ShippingDashboardData>(emptyDashboard);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const canCreate =
    access?.isSuperAdmin ||
    ["OWNER", "ADMIN", "OPERATIONS"].includes(
      access?.storeMembership?.role || ""
    );

  useEffect(() => {
    async function loadDashboard() {
      if (!activeStore?.id) {
        setDashboard(emptyDashboard);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const { data, error } = await getShippingDashboard(
        activeStore.id
      );

      if (error) {
        setErrorMessage(
          error.message ||
            "No se pudo cargar el dashboard operativo."
        );
        setDashboard(emptyDashboard);
      } else {
        setDashboard(data || emptyDashboard);
      }

      setLoading(false);
    }

    if (!accessLoading && !storeLoading) {
      void loadDashboard();
    }
  }, [
    accessLoading,
    storeLoading,
    activeStore?.id,
  ]);

  if (loading || accessLoading || storeLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center">
          <div className="text-center text-slate-500">
            <Loader2 className="mx-auto mb-3 animate-spin" size={30} />
            <p className="font-semibold">Preparando dashboard operativo...</p>
          </div>
        </div>
      </main>
    );
  }

  const summary = dashboard.summary;

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-28 md:p-6 xl:p-8">
      <div className="mx-auto max-w-[1500px]">
        <AdminPageHeader
          eyebrow="Centro de operaciones"
          icon={Truck}
          title="Dashboard de envíos"
          description={`Controla paquetes, remesas, repartidores y cobros de ${activeStore?.name || "la empresa"} desde una sola vista.`}
          actions={<>
            {canCreate && (
              <Link href="/admin/shipping/new" className="inline-flex items-center gap-2 rounded-xl bg-[#061b3a] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Plus size={17} />
                Nueva operación
              </Link>
            )}
            {canCreate && (
              <Link href="/admin/shipping/recoger" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                <MapPin size={17} />
                Recogida en casa
              </Link>
            )}
            <Link href="/admin/shipping/shipments" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <Truck size={17} />
              Ver lista de envíos
            </Link>
            <Link href="/admin/shipping/settings/pagos" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <WalletCards size={17} />
              Cobros en línea
            </Link>
            <Link href="/admin/shipping/settings" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              <Settings2 size={17} />
              Ajustes
            </Link>
          </>}
          stats={<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white px-3 py-3 text-center"><div className="flex items-center justify-center gap-1.5 text-slate-400"><CalendarDays size={15} /><p className="text-xs font-bold">Creados hoy</p></div><p className="mt-1 text-lg font-black text-slate-900">{summary.created_today}</p></div>
            <div className="rounded-xl bg-white px-3 py-3 text-center"><div className="flex items-center justify-center gap-1.5 text-slate-400"><PackageCheck size={15} /><p className="text-xs font-bold">Entregados hoy</p></div><p className="mt-1 text-lg font-black text-slate-900">{summary.delivered_today}</p></div>
            <div className="rounded-xl bg-white px-3 py-3 text-center"><div className="flex items-center justify-center gap-1.5 text-slate-400"><DollarSign size={15} /><p className="text-xs font-bold">Facturado hoy</p></div><p className="mt-1 text-lg font-black text-slate-900">{currency(summary.billed_today)}</p></div>
            <div className="rounded-xl bg-white px-3 py-3 text-center"><div className="flex items-center justify-center gap-1.5 text-slate-400"><Scale size={15} /><p className="text-xs font-bold">Libras hoy</p></div><p className="mt-1 text-lg font-black text-slate-900">{summary.weight_today_lb.toFixed(1)}</p></div>
          </div>}
        />

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-700">
            {errorMessage}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OperationalMetricCard
            label="Pendientes"
            value={summary.pending_total.toString()}
            helper={`${summary.unassigned_total} sin repartidor asignado`}
            icon={<Clock3 size={22} />}
            tone="amber"
          />

          <OperationalMetricCard
            label="En tránsito"
            value={summary.in_transit_total.toString()}
            helper={`${summary.received_cuba_total} ya recibidos en Cuba`}
            icon={<Truck size={22} />}
            tone="violet"
          />

          <OperationalMetricCard
            label="Saldo pendiente"
            value={currency(summary.outstanding_total)}
            helper={`${currency(summary.paid_total)} registrado como pagado`}
            icon={<WalletCards size={22} />}
            tone="rose"
          />

          <OperationalMetricCard
            label="Facturado este mes"
            value={currency(summary.billed_this_month)}
            helper={`${summary.created_this_week} operaciones creadas esta semana`}
            icon={<Banknote size={22} />}
            tone="emerald"
          />
        </section>

        <div className="mt-6">
          <StatusOverview statuses={dashboard.statuses} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <SevenDayActivity days={dashboard.last_7_days} />
          <TopDestinations destinations={dashboard.top_destinations} />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.55fr]">
          <DriverPerformance drivers={dashboard.drivers} />
          <RecentShipments shipments={dashboard.recent_shipments} />
        </div>

        {(summary.issues_total > 0 ||
          summary.unassigned_total > 0) && (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {summary.issues_total > 0 && (
              <AlertCard
                icon={<CircleAlert size={21} />}
                title={`${summary.issues_total} envío(s) con incidencia`}
                text="Revisa las operaciones que necesitan atención."
                href="/admin/shipping/shipments?status=issue"
                tone="rose"
              />
            )}

            {summary.unassigned_total > 0 && (
              <AlertCard
                icon={<UserRoundX size={21} />}
                title={`${summary.unassigned_total} envío(s) sin repartidor`}
                text="Asigna responsables para evitar retrasos."
                href="/admin/shipping/shipments"
                tone="amber"
              />
            )}
          </section>
        )}
      </div>
    </main>
  );
}


function AlertCard({
  icon,
  title,
  text,
  href,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href: string;
  tone: "rose" | "amber";
}) {
  const styles =
    tone === "rose"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-3xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${styles}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70">
        {icon}
      </div>
      <div>
        <p className="font-extrabold">{title}</p>
        <p className="mt-1 text-sm font-medium opacity-75">{text}</p>
      </div>
    </Link>
  );
}
