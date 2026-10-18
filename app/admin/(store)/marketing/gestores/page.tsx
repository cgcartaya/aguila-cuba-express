"use client";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

import OwnerPanel from "@/components/shareapp/OwnerPanel";

export default function GestoresAdminPage() {
  const { loading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const storeId = (isSuperAdmin ? selectedStore || accessStore : accessStore)
    ?.id;
  if (loading) return <main className="p-8">Verificando acceso…</main>;
  if (!storeId) return <main className="p-8">Selecciona una tienda.</main>;
  return (
    <OwnerPanel
      key={storeId}
      storeId={storeId}
      storeName={
        (isSuperAdmin ? selectedStore || accessStore : accessStore)?.name ||
        "Tu tienda"
      }
    />
  );
}
