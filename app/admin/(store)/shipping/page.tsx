"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import ShippingOperationsOverview from "@/components/admin/shipping/dashboard/ShippingOperationsOverview";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getShippingDashboard } from "@/lib/services/shipping-dashboard";
import type { ShippingDashboardData } from "@/lib/shipping/dashboard-types";

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

  const [dashboardStoreId, setDashboardStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const canCreate =
    access?.isSuperAdmin ||
    ["OWNER", "ADMIN", "OPERATIONS"].includes(
      access?.storeMembership?.role || ""
    );

  useEffect(() => {
    let current = true;
    async function loadDashboard() {
      if (!activeStore?.id) {
        setDashboard(emptyDashboard);
        setDashboardStoreId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage("");

      const { data, error } = await getShippingDashboard(
        activeStore.id
      ).catch(() => ({data:null,error:new Error("No se pudo conectar. Actualiza para reintentar.")}));

      if (!current) return;
      setDashboardStoreId(activeStore.id);

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
    return () => { current = false; };
  }, [
    accessLoading,
    storeLoading,
    activeStore?.id,
  ]);

  if (loading || accessLoading || storeLoading || (activeStore?.id && activeStore.id !== dashboardStoreId)) {
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

  return <ShippingOperationsOverview dashboard={dashboard} storeName={activeStore?.name||"Agencia de envíos"} canCreate={!!canCreate} error={errorMessage} canOnlinePayments={activeStore?.slug==='alvarez-travel'}/>;
}
