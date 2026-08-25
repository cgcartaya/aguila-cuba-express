"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";

import AnalyticsDashboard from "@/components/admin/analytics/AnalyticsDashboard";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function StoreAnalyticsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const store = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [accessStore, isSuperAdmin, selectedStore]);

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-4 pb-24 md:p-7">
      <div className="mx-auto max-w-[1500px]">
        <section className="mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#083d82] to-[#1769e8] px-6 py-7 text-white shadow-xl md:px-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-blue-100"><BarChart3 size={15} />Analítica comercial</div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Rendimiento de la tienda</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-blue-100">Visitas, productos, platos, carrito, checkout, órdenes y campañas de {store?.name || "la tienda activa"}.</p>
        </section>

        {accessLoading || storeLoading ? <div className="rounded-3xl bg-white p-10 text-center font-bold text-slate-500">Cargando tienda...</div> : store?.id ? <AnalyticsDashboard storeId={store.id} /> : <div className="rounded-3xl bg-white p-10 text-center font-bold text-rose-600">Selecciona una tienda para ver sus estadísticas.</div>}
      </div>
    </main>
  );
}
