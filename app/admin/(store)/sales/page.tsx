"use client";

import Link from "next/link";
import { ArrowLeft, ChartNoAxesCombined } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import LymSalesReport from "@/components/lym/LymSalesReport";

export default function MonthlySalesPage() {
  const {
    access,
    loading: accessLoading,
    isSuperAdmin,
    store: accessStore,
  } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const store = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const canView =
    isSuperAdmin ||
    (access?.storeMembership?.active &&
      ["OWNER", "ADMIN"].includes(access.storeMembership.role));

  if (accessLoading || storeLoading)
    return (
      <main className="p-6">
        <p role="status">Cargando ventas del mes…</p>
      </main>
    );
  if (
    !store ||
    store.slug !== "lym" ||
    !store.module_store_enabled ||
    !canView
  ) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-xl font-black">Ventas del mes</h1>
          <p className="mt-3 text-sm text-slate-600">
            Este reporte está disponible para la administradora de LYM.
          </p>
          <Link
            href="/admin"
            className="mt-4 inline-block font-bold text-blue-700"
          >
            Volver a la administración
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-28 text-[#061b3a] md:p-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/orders"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700"
        >
          <ArrowLeft size={16} />
          Órdenes
        </Link>
        <AdminPageHeader
          eyebrow="LYM"
          icon={ChartNoAxesCombined}
          title="Ventas del mes"
          description="Ventas confirmadas, solicitudes pendientes y resultados por persona."
        />
        <LymSalesReport key={store.id} storeId={store.id} />
      </div>
    </main>
  );
}
