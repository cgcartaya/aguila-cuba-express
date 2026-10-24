"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import MenuItemForm from "@/components/admin/menu/MenuItemForm";
import { getMenuCategoriesForAdmin } from "@/lib/services/menu";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { MenuItemFormData } from "@/lib/menu/types";

const EMPTY_ITEM: MenuItemFormData = { category_id:"",name:"",description:"",name_en:"",description_en:"",price:0,image_url:null,is_active:true,is_featured:false,sort_order:0,track_stock:false,stock:0,daily_stock_enabled:false,available_dine_in:true,available_takeaway:true,available_delivery:true,option_groups:[] };
type AdminCategory={id:string;name:string;venue_type?:"bar"|"restaurant"|"general";is_active?:boolean};

export default function NewMenuItemPage() {
  const { loading:accessLoading,isSuperAdmin,store:accessStore }=useAdminAccess();
  const { store:selectedStore,loading:storeLoading }=useStore();
  const activeStore=useMemo(()=>isSuperAdmin?selectedStore||accessStore:accessStore,[accessStore,isSuperAdmin,selectedStore]);
  const [categories,setCategories]=useState<{id:string;name:string}[]>([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{const load=async()=>{if(accessLoading||storeLoading||!activeStore?.id)return;const {data}=await getMenuCategoriesForAdmin(activeStore.id);const all=(data||[]) as AdminCategory[];const valid=activeStore.slug==="aguila"?all.filter(c=>c.venue_type==="restaurant"&&c.is_active!==false):all.filter(c=>c.is_active!==false);setCategories(valid.map(({id,name})=>({id,name})));setLoading(false);};void load();},[accessLoading,storeLoading,activeStore?.id,activeStore?.slug]);
  if(loading||accessLoading||storeLoading||!activeStore?.id)return <main className="min-h-screen bg-slate-50 px-4 pt-6 text-center text-sm font-semibold text-slate-500">Cargando...</main>;
  if(categories.length===0)return <main className="min-h-screen bg-slate-50 px-4 py-10 text-[#061b3a]"><div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-black">Primero crea una categoría</h1><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">No puedes crear un platillo sin una categoría activa del restaurante. Así evitamos platos sueltos o mezclados con otras secciones.</p><Link href="/admin/menu" className="mt-5 inline-flex rounded-xl bg-[#FF641F] px-5 py-3 text-sm font-black text-white">Ir a Categorías y platillos</Link></div></main>;
  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a] sm:px-6 lg:px-8"><MenuItemForm storeId={activeStore.id} categories={categories} initialData={EMPTY_ITEM}/></main>;
}
