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
  PackageCheck,
  Plus,
  Scale,
  Settings2,
  Sparkles,
  Truck,
  UserRoundX,
  WalletCards,
} from "lucide-react";

import DriverPerformance from "@/components/admin/shipping/dashboard/DriverPerformance";
import OperationalMetricCard from "@/components/admin/shipping/dashboard/OperationalMetricCard";
import RecentShipments from "@/components/admin/shipping/dashboard/RecentShipments";
import SevenDayActivity from "@/components/admin/shipping/dashboard/SevenDayActivity";
import ShippingQuickActions from "@/components/admin/shipping/dashboard/ShippingQuickActions";
import StatusOverview from "@/components/admin/shipping/dashboard/StatusOverview";
import TopDestinations from "@/components/admin/shipping/dashboard/TopDestinations";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getShippingDashboard } from "@/lib/services/shipping-dashboard";
import type { ShippingDashboardData } from "@/lib/shipping/dashboard-types";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
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
        <header className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#0a2d63] to-[#1554a6] p-6 text-white shadow-xl md:p-8">
          <div className="absolute -right-12 -top-16 h-56 w-56 rounded-full bg-blue-400/15 blur-2xl" />
          <div className="absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-violet-400/10 blur-2xl" />

          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-blue-100">
                <Sparkles size={15} />
                Centro de operaciones
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
                Dashboard de envíos
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-blue-100/80 md:text-base">
                Controla paquetes, remesas, repartidores y cobros de{" "}
                <span className="font-extrabold text-white">
                  {activeStore?.name || "la empresa"}
                </span>{" "}
                desde una sola vista.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {canCreate && (
                  <Link
                    href="/admin/shipping/new"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-[#061b3a] shadow-lg transition hover:-translate-y-0.5"
                  >
                    <Plus size={18} />
                    Nueva operación
                  </Link>
                )}

                <Link
                  href="/admin/shipping/shipments"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <Truck size={18} />
                  Ver lista de envíos
                </Link>

                <Link
                  href="/admin/shipping/settings"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <Settings2 size={18} />
                  Ajustes
                </Link>
              </div>
            </div>

            <div className="grid min-w-full grid-cols-2 gap-3 sm:min-w-[420px]">
              <HeroMiniMetric
                label="Creados hoy"
                value={summary.created_today.toString()}
                icon={<CalendarDays size={18} />}
              />
              <HeroMiniMetric
                label="Entregados hoy"
                value={summary.delivered_today.toString()}
                icon={<PackageCheck size={18} />}
              />
              <HeroMiniMetric
                label="Facturado hoy"
                value={currency(summary.billed_today)}
                icon={<DollarSign size={18} />}
              />
              <HeroMiniMetric
                label="Libras hoy"
                value={summary.weight_today_lb.toFixed(1)}
                icon={<Scale size={18} />}
              />
            </div>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-700">
            {errorMessage}
          </div>
        )}

        <ShippingQuickActions />

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

function HeroMiniMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-blue-100">
        {icon}
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <p className="mt-2 text-xl font-extrabold text-white">{value}</p>
    </div>
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
