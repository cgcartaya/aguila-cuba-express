"use client";

import { Loader2, TrendingUp } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import MenuUpsellManager from "@/components/admin/menu/MenuUpsellManager";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function MenuUpsellsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = isSuperAdmin ? selectedStore || accessStore : accessStore;

  if (accessLoading || storeLoading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </main>
    );
  }

  if (!activeStore?.id) {
    return (
      <main className="p-8 text-center text-slate-400">
        Selecciona una tienda.
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Menú"
        title="Ventas adicionales"
        description="Configura bebidas, postres y complementos sugeridos para aumentar el ticket promedio."
        storeName={activeStore.name}
        icon={TrendingUp}
      />

      <div className="mt-6">
        <MenuUpsellManager storeId={activeStore.id} />
      </div>
    </main>
  );
}
