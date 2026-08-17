"use client";

import { Loader2, RadioTower } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import MenuOperationPanel from "@/components/admin/menu/MenuOperationPanel";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function MenuOperationPage() {
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
    <main className="mx-auto max-w-6xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Menú"
        title="Operación en vivo"
        description="Controla pedidos, tiempos y agotados durante el servicio sin tocar la configuración permanente."
        storeName={activeStore.name}
        icon={RadioTower}
      />

      <div className="mt-6">
        <MenuOperationPanel storeId={activeStore.id} />
      </div>
    </main>
  );
}
