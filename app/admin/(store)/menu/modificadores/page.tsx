"use client";

import { Layers3, Loader2 } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import ModifierTemplatesManager from "@/components/admin/menu/ModifierTemplatesManager";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function ModifierTemplatesPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
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
    return <main className="p-8 text-center text-slate-400">Selecciona una tienda.</main>;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <AdminPageHeader
        eyebrow="Menú"
        title="Modificadores reutilizables"
        description="Crea acompañamientos, salsas, términos de cocción y extras una sola vez y reutilízalos en tus platos."
        storeName={activeStore.name}
        icon={Layers3}
      />

      <div className="mt-6">
        <ModifierTemplatesManager storeId={activeStore.id} />
      </div>
    </main>
  );
}
