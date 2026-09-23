"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

export default function MarketingAnalyticsPage() {
  const { loading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const store = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [isSuperAdmin, selectedStore, accessStore]);
  if (loading) return <main className="p-8">Verificando acceso...</main>;
  if (!store?.id) return <main className="p-8">Selecciona una tienda.</main>;
  if (!store.module_marketing_analytics_enabled) return <main className="p-8"><h1 className="text-xl font-bold">Módulo no habilitado</h1><p>Contacta al administrador de la plataforma para activar esta función.</p><Link href="/admin">Volver al panel</Link></main>;
  return <main className="p-6 md:p-10"><h1 className="text-3xl font-black">Resultados de campañas</h1><p className="mt-3 text-slate-600">Tienda: {store.name}</p><p className="mt-6 rounded-2xl border bg-white p-6">El seguimiento de campañas se incorporará en una fase posterior.</p></main>;
}
