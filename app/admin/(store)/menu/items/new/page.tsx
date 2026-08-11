"use client";

import { useEffect, useMemo, useState } from "react";

import MenuItemForm from "@/components/admin/menu/MenuItemForm";
import { getMenuCategoriesForAdmin } from "@/lib/services/menu";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { MenuItemFormData } from "@/lib/menu/types";

const EMPTY_ITEM: MenuItemFormData = {
  category_id: "",
  name: "",
  description: "",
  price: 0,
  image_url: null,
  is_active: true,
  sort_order: 0,
  option_groups: [],
};

export default function NewMenuItemPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (accessLoading || storeLoading || !activeStore?.id) return;
      const { data } = await getMenuCategoriesForAdmin(activeStore.id);
      setCategories(data || []);
      setLoading(false);
    };
    load();
  }, [accessLoading, storeLoading, activeStore?.id]);

  if (loading || accessLoading || storeLoading || !activeStore?.id) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 pt-6 text-center text-sm font-semibold text-slate-500">
        Cargando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 text-[#061b3a] xl:pb-6">
      <h1 className="mx-auto mb-4 max-w-3xl text-xl font-black">Nuevo platillo</h1>
      <MenuItemForm storeId={activeStore.id} categories={categories} initialData={EMPTY_ITEM} />
    </main>
  );
}
