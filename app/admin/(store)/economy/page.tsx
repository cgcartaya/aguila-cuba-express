"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Building2, CircleDollarSign, Loader2, LockKeyhole, PackagePlus } from "lucide-react";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import EconomyDashboard from "@/components/admin/economy/EconomyDashboard";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getEconomyModuleStatus } from "@/lib/services/economy";

export default function EconomyPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore }=useAdminAccess();
  const { store: selectedStore, loading: storeLoading }=useStore();
  const activeStore=useMemo(()=>isSuperAdmin?selectedStore||accessStore:accessStore,[accessStore,isSuperAdmin,selectedStore]);
  const [moduleEnabled,setModuleEnabled]=useState(false);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{
    let mounted=true;
    async function check(){
      if(accessLoading||storeLoading)return;
      if(!activeStore?.id){setChecking(false);return;}
      setChecking(true);
      const settings=await getEconomyModuleStatus(activeStore.id);
      if(!mounted)return;
      setModuleEnabled(Boolean(settings?.module_economy_enabled));setChecking(false);
    }
    void check(); return()=>{mounted=false;};
  },[accessLoading,storeLoading,activeStore?.id]);

  if(accessLoading||storeLoading||checking)return <main className="min-h-screen bg-[#f4f7fb] p-6"><div className="mx-auto flex min-h-64 max-w-7xl items-center justify-center rounded-3xl bg-white"><Loader2 className="animate-spin text-blue-700" size={32}/></div></main>;
  if(!activeStore?.id)return <main className="min-h-screen bg-[#f4f7fb] p-6"><div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 text-center shadow-sm">Selecciona una tienda para consultar su economía.</div></main>;

  if(!moduleEnabled&&!isSuperAdmin)return <main className="min-h-screen bg-[#f4f7fb] p-6"><div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm"><LockKeyhole className="mx-auto text-slate-400" size={38}/><h1 className="mt-4 text-2xl font-black text-[#061b3a]">Módulo no contratado</h1><p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-500">Economía y rentabilidad no está activo para esta tienda.</p></div></main>;

  return <main className="min-h-screen bg-[#f4f7fb] p-4 pb-24 md:p-7"><div className="mx-auto max-w-[1500px]">
    <AdminPageHeader
      eyebrow="Control financiero"
      icon={CircleDollarSign}
      title="Economía y rentabilidad"
      description={`Costos, márgenes, gastos y rendimiento de ${activeStore.name||"la tienda activa"}.`}
      actions={<>
        <Link href="/admin/economy/compras" className="inline-flex items-center gap-2 rounded-xl bg-[#061b3a] px-4 py-2.5 text-sm font-black text-white shadow-sm"><PackagePlus size={16}/>Compras</Link>
        <Link href="/admin/economy/proveedores" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"><Building2 size={16}/>Proveedores</Link>
      </>}
    />
    {!moduleEnabled&&isSuperAdmin&&<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">Estás viendo este módulo como Superadmin. Para el dueño continúa desactivado.</div>}
    <EconomyDashboard key={activeStore.id} storeId={activeStore.id} storeName={activeStore.name||"Tienda"}/>
  </div></main>;
}
