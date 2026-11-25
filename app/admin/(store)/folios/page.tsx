"use client";

import { useEffect, useState } from "react";
import LuxuryInvoicePreview from "@/components/admin/shipping/LuxuryInvoicePreview";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { canAccessAdminPath } from "@/lib/admin/navigation-access";
import { getShippingConfiguration } from "@/lib/services/shipping-settings";
import { getOpenShippingTripsByStoreId } from "@/lib/services/shipping-trips";

export default function FoliosPage() {
  const { access, store, isSuperAdmin, loading } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const agency = isSuperAdmin ? selectedStore || store : store;

  if (loading || storeLoading) return <p className="p-6" role="status">Cargando agencia…</p>;
  if (agency?.slug !== "luxury-travel-point" || !agency.module_shipping_enabled
    || !canAccessAdminPath("/admin/folios", access?.storeMembership ?? null, isSuperAdmin)) {
    return <p className="p-6">Folios no está disponible para esta agencia o tu usuario.</p>;
  }

  return <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6">
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-black text-[#061b3a]">Facturas con folio</h1>
        <p className="mt-1 text-sm text-slate-600">Registra servicios y consulta las facturas de Luxury Travel Point.</p>
      </header>
      <FolioWorkspace key={agency.id} storeId={agency.id} />
    </div>
  </main>;
}

function FolioWorkspace({ storeId }: { storeId: string }) {
  const [result, setResult] = useState<{ config: Awaited<ReturnType<typeof getShippingConfiguration>>; trips: Awaited<ReturnType<typeof getOpenShippingTripsByStoreId>> } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([getShippingConfiguration(storeId), getOpenShippingTripsByStoreId(storeId)])
      .then(([config, trips]) => {
        if (!active) return;
        if (config.error) throw new Error(config.error.message);
        setResult({ config, trips });
      }).catch(() => {
        if (active) setError("No se pudo cargar la configuración de Luxury. Recarga la página para reintentar.");
      });
    return () => { active = false; };
  }, [storeId]);

  if (error) return <p role="alert" className="text-red-700">{error}</p>;
  if (!result) return <p role="status">Cargando folios…</p>;

  const { config, trips } = result;
  return <>
    {trips.error && <p role="status" className="text-sm text-slate-600">No se pudieron cargar los viajes de referencia.</p>}
    <LuxuryInvoicePreview storeId={storeId} countries={config.countries} provinces={config.provinces}
      municipalities={config.municipalities} locations={config.locations} trips={trips.data || []}
      services={config.serviceTypes} rates={config.rates} />
  </>;
}
