"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {ArrowLeft,Loader2,UtensilsCrossed} from "lucide-react";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import RestaurantEconomyDashboard from "@/components/admin/economy/RestaurantEconomyDashboard";
import {useAdminAccess} from "@/hooks/useAdminAccess";
import {useStore} from "@/hooks/useStore";
import {getEconomyModuleStatus,type EconomySettings} from "@/lib/services/economy";

export default function RestaurantEconomyPage(){
  const {loading:accessLoading,isSuperAdmin,store:accessStore}=useAdminAccess();
  const {store:selectedStore,loading:storeLoading}=useStore();
  const activeStore=useMemo(()=>isSuperAdmin?selectedStore||accessStore:accessStore,[accessStore,isSuperAdmin,selectedStore]);
  const [settings,setSettings]=useState<EconomySettings|null>(null);
  const [checking,setChecking]=useState(true);

  useEffect(()=>{let mounted=true;(async()=>{
    if(accessLoading||storeLoading)return;
    if(!activeStore?.id){setChecking(false);return;}
    const x=await getEconomyModuleStatus(activeStore.id);
    if(mounted){setSettings(x);setChecking(false);}
  })();return()=>{mounted=false};},[accessLoading,storeLoading,activeStore?.id]);

  if(accessLoading||storeLoading||checking)return <main className="min-h-screen bg-[#f4f7fb] p-6"><div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-blue-700" size={30}/></div></main>;
  if(!activeStore?.id||(!settings?.module_economy_enabled&&!isSuperAdmin))return <main className="min-h-screen bg-[#f4f7fb] p-6"><div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center font-bold text-slate-600">Economía no está disponible para esta tienda.</div></main>;

  return <main className="min-h-screen bg-[#f4f7fb] p-4 pb-24 md:p-7"><div className="mx-auto max-w-[1500px]">
    <AdminPageHeader
      eyebrow="Economía · Fase 4"
      icon={UtensilsCrossed}
      title="Costeo de restaurante"
      description="Ingredientes, recetas, merma y rentabilidad real de cada platillo y modificador."
      breadcrumbs={[{label:"Economía",href:"/admin/economy"},{label:"Costeo restaurante"}]}
      actions={<Link href="/admin/economy" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"><ArrowLeft size={16}/>Resumen</Link>}
    />
    <RestaurantEconomyDashboard storeId={activeStore.id} currency={settings?.economy_currency||"USD"}/>
  </div></main>;
}
