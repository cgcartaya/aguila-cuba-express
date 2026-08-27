"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, Loader2, PackagePlus } from "lucide-react";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import SuppliersManager from "@/components/admin/economy/SuppliersManager";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getEconomyModuleStatus } from "@/lib/services/economy";

export default function EconomySuppliersPage(){
  const {loading:accessLoading,isSuperAdmin,store:accessStore}=useAdminAccess();
  const {store:selectedStore,loading:storeLoading}=useStore();
  const activeStore=useMemo(()=>isSuperAdmin?selectedStore||accessStore:accessStore,[accessStore,isSuperAdmin,selectedStore]);
  const [enabled,setEnabled]=useState(false); const [checking,setChecking]=useState(true);

  useEffect(()=>{
    let mounted=true;
    async function load(){
      if(accessLoading||storeLoading)return;
      if(!activeStore?.id){setChecking(false);return;}
      setChecking(true); const data=await getEconomyModuleStatus(activeStore.id);
      if(mounted){setEnabled(Boolean(data?.module_economy_enabled));setChecking(false);}
    }
    void load(); return()=>{mounted=false;};
  },[accessLoading,storeLoading,activeStore?.id]);

  if(accessLoading||storeLoading||checking)return <main className="min-h-screen bg-[#f4f7fb] p-6"><div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={30}/></div></main>;
  if(!activeStore?.id||(!enabled&&!isSuperAdmin))return <main className="min-h-screen bg-[#f4f7fb] p-6"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center font-bold text-slate-600">Economía no está disponible para esta tienda.</div></main>;

  return <main className="min-h-screen bg-[#f4f7fb] p-4 pb-24 md:p-7"><div className="mx-auto max-w-[1500px]">
    <AdminPageHeader eyebrow="Economía · Fase 2" icon={Building2} title="Proveedores" description="Directorio de proveedores para relacionar compras y costos."
      breadcrumbs={[{label:"Economía",href:"/admin/economy"},{label:"Proveedores"}]}
      actions={<><Link href="/admin/economy" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"><ArrowLeft size={16}/>Resumen</Link><Link href="/admin/economy/compras" className="inline-flex items-center gap-2 rounded-xl bg-[#061b3a] px-4 py-2.5 text-sm font-black text-white"><PackagePlus size={16}/>Compras</Link></>}
    />
    <SuppliersManager storeId={activeStore.id}/>
  </div></main>;
}
