"use client";

import { useMemo } from "react";
import { QrCode } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import TableQRGenerator from "@/components/admin/menu/TableQRGenerator";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function AdminMenuQrPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const loading = accessLoading || storeLoading;

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 text-[#061b3a] xl:pb-6 print:bg-white print:pb-0 print:pt-0">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 print:hidden">
          <AdminPageHeader
            eyebrow="Menú digital"
            icon={QrCode}
            title="Códigos QR de mesa"
            description={`Genera e imprime los códigos QR de mesa para ${activeStore?.name || "la tienda activa"}.`}
            breadcrumbs={[{ label: "Menú", href: "/admin/menu" }, { label: "Códigos QR" }]}
          />
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
            Cargando...
          </div>
        ) : !activeStore ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500">
              No se encontró una tienda activa.
            </p>
          </div>
        ) : (
          <TableQRGenerator
            storeSlug={activeStore.slug}
            storeName={activeStore.name}
            customDomain={activeStore.domain}
          />
        )}
      </div>
    </main>
  );
}
