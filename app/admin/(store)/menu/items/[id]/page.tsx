"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, Ban, UtensilsCrossed } from "lucide-react";
import MenuItemForm from "@/components/admin/menu/MenuItemForm";
import { getMenuCategoriesForAdmin, getMenuItemById } from "@/lib/services/menu";
import { getMenuItemOperationalState, type MenuItemOperationalState } from "@/lib/services/menu-operation";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { MenuItemFormData } from "@/lib/menu/types";

export default function EditMenuItemPage() {
  const params = useParams<{ id: string }>();
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const activeStore = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [accessStore, isSuperAdmin, selectedStore]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [initialData, setInitialData] = useState<MenuItemFormData | null>(null);
  const [operationalState, setOperationalState] = useState<MenuItemOperationalState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (accessLoading || storeLoading || !activeStore?.id) return;
      const [{ data: cats }, { data: item, error }, state] = await Promise.all([
        getMenuCategoriesForAdmin(activeStore.id), getMenuItemById(params.id), getMenuItemOperationalState(activeStore.id, params.id),
      ]);
      setCategories(cats || []); setOperationalState(state);
      if (error || !item) { setLoading(false); return; }
      setInitialData({
        id: item.id, category_id: item.category_id, name: item.name, description: item.description || "", name_en: item.name_en || "", description_en: item.description_en || "", price: item.price, image_url: item.image_url, is_active: item.is_active, is_featured: item.is_featured, sort_order: item.sort_order,
        track_stock: item.stock !== null && item.stock !== undefined, stock: item.stock ?? 0, daily_stock_enabled: Boolean(item.daily_stock_enabled), available_dine_in: item.available_dine_in !== false, available_takeaway: item.available_takeaway !== false, available_delivery: item.available_delivery !== false,
        option_groups: (item.menu_item_option_groups || []).map((g: any) => ({ id: g.id, name: g.name, is_required: g.is_required, max_selections: g.max_selections, sort_order: g.sort_order, options: (g.menu_item_options || []).map((o: any) => ({ id: o.id, label: o.label, price_delta: o.price_delta, sort_order: o.sort_order })) })),
      });
      setLoading(false);
    };
    void load();
  }, [accessLoading, storeLoading, activeStore?.id, params.id]);

  if (loading || accessLoading || storeLoading || !activeStore?.id) return <main className="min-h-screen bg-slate-50 px-4 pt-6 text-center text-sm font-semibold text-slate-500">Cargando...</main>;
  if (!initialData) return <main className="min-h-screen bg-slate-50 px-4 pt-6 text-center text-sm font-semibold text-slate-500">No se encontró el platillo.</main>;

  const temporaryRestaurantOnly = Boolean(operationalState?.delivery_paused_date);
  const operationalOverride = Boolean(operationalState?.manual_unavailable || temporaryRestaurantOnly);

  return <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a] sm:px-6 lg:px-8">
    {operationalOverride && <div className={`mx-auto mb-5 max-w-5xl rounded-2xl border p-4 ${operationalState?.manual_unavailable ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}`}>
      <div className="flex gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white ${operationalState?.manual_unavailable ? "text-red-600" : "text-orange-600"}`}>{operationalState?.manual_unavailable ? <Ban size={18}/> : <UtensilsCrossed size={18}/>}</span><div><div className="flex items-center gap-2"><AlertTriangle size={14}/><p className="text-sm font-black">Estado operativo actual</p></div><p className="mt-1 text-xs font-semibold leading-5 text-slate-600">{operationalState?.manual_unavailable ? "Este platillo está marcado como agotado desde Operación en vivo. La configuración permanente de abajo no elimina ese bloqueo operativo." : `Este platillo está temporalmente solo para consumo en el restaurante${operationalState?.restaurant_only_indefinite ? " hasta que sea reactivado" : operationalState?.delivery_paused_date ? ` hasta el ${operationalState.delivery_paused_date.split("-").reverse().join("/")}` : ""}.${operationalState?.delivery_pause_reason ? ` Motivo: ${operationalState.delivery_pause_reason}.` : ""}`}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Los cambios temporales se administran desde Operación en vivo; los controles de este formulario son la configuración base del platillo.</p></div></div>
    </div>}
    <MenuItemForm storeId={activeStore.id} categories={categories} initialData={initialData}/>
  </main>;
}
