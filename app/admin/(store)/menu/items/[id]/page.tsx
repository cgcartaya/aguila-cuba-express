"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import MenuItemForm from "@/components/admin/menu/MenuItemForm";
import { getMenuCategoriesForAdmin, getMenuItemById } from "@/lib/services/menu";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { MenuItemFormData } from "@/lib/menu/types";

export default function EditMenuItemPage() {
  const params = useParams<{ id: string }>();
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [initialData, setInitialData] = useState<MenuItemFormData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (accessLoading || storeLoading || !activeStore?.id) return;

      const [{ data: cats }, { data: item, error }] = await Promise.all([
        getMenuCategoriesForAdmin(activeStore.id),
        getMenuItemById(params.id),
      ]);

      setCategories(cats || []);

      if (error || !item) {
        setLoading(false);
        return;
      }

      setInitialData({
        id: item.id,
        category_id: item.category_id,
        name: item.name,
        description: item.description || "",
        name_en: item.name_en || "",
        description_en: item.description_en || "",
        price: item.price,
        image_url: item.image_url,
        is_active: item.is_active,
        is_featured: item.is_featured,
        sort_order: item.sort_order,
        track_stock: item.stock !== null && item.stock !== undefined,
        stock: item.stock ?? 0,
        daily_stock_enabled: Boolean(item.daily_stock_enabled),
        available_dine_in: item.available_dine_in !== false,
        available_takeaway: item.available_takeaway !== false,
        available_delivery: item.available_delivery !== false,
        option_groups: (item.menu_item_option_groups || []).map((g: any) => ({
          id: g.id,
          name: g.name,
          is_required: g.is_required,
          max_selections: g.max_selections,
          sort_order: g.sort_order,
          options: (g.menu_item_options || []).map((o: any) => ({
            id: o.id,
            label: o.label,
            price_delta: o.price_delta,
            sort_order: o.sort_order,
          })),
        })),
      });
      setLoading(false);
    };
    load();
  }, [accessLoading, storeLoading, activeStore?.id, params.id]);

  if (loading || accessLoading || storeLoading || !activeStore?.id) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pt-6 text-center text-sm font-semibold text-slate-500">
        Cargando...
      </main>
    );
  }

  if (!initialData) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pt-6 text-center text-sm font-semibold text-slate-500">
        No se encontró el platillo.
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a] sm:px-6 lg:px-8">
      <MenuItemForm storeId={activeStore.id} categories={categories} initialData={initialData} />
    </main>
  );
}
