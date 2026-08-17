"use client";

import { ChefHat, Loader2 } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import KitchenBoard from "@/components/admin/menu/KitchenBoard";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function KitchenPage() {
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
    <main className="mx-auto max-w-[1500px] px-4 py-6">
      <AdminPageHeader
        eyebrow="Menú"
        title="Cocina"
        description="Tablero operativo para nuevas órdenes, preparación y entrega."
        storeName={activeStore.name}
        icon={ChefHat}
      />

      <div className="mt-6">
        <KitchenBoard storeId={activeStore.id} />
      </div>
    </main>
  );
}
