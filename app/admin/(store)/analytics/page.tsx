"use client";

import { useMemo } from "react";
import AnalyticsDashboard from "@/components/admin/analytics/AnalyticsDashboard";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function AnalyticsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [isSuperAdmin, selectedStore, accessStore]);

  return <main className="min-h-screen bg-gray-50 p-4 pb-28 text-[#061b3a] md:p-6"><div className="mx-auto max-w-7xl"><div className="mb-6"><h1 className="text-3xl font-black">Visitas</h1><p className="mt-1 text-sm font-semibold text-slate-500">Estadísticas de {activeStore?.name || "la tienda activa"}.</p></div>{accessLoading || storeLoading ? <div className="rounded-3xl bg-white p-8 text-center font-semibold text-slate-500">Cargando tienda...</div> : activeStore?.id ? <AnalyticsDashboard storeId={activeStore.id} /> : <div className="rounded-3xl bg-amber-50 p-5 font-bold text-amber-700">Selecciona una tienda para ver sus visitas.</div>}</div></main>;
}
