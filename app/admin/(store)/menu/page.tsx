"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Utensils } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import CategoryManager from "@/components/admin/menu/CategoryManager";
import MenuItemCard from "@/components/admin/menu/MenuItemCard";
import {
  deleteMenuItem,
  getMenuCategoriesForAdmin,
  getMenuItemsForAdmin,
} from "@/lib/services/menu";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { MenuItem } from "@/lib/menu/types";

type Category = { id: string; name: string; sort_order: number; is_active: boolean };

export default function AdminMenuPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (accessLoading || storeLoading) return;
    if (!activeStore?.id) {
      setCategories([]);
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: cats, error: catsError }, { data: menuItems, error: itemsError }] =
      await Promise.all([
        getMenuCategoriesForAdmin(activeStore.id),
        getMenuItemsForAdmin(activeStore.id),
      ]);

    if (catsError) console.error("Error cargando categorías:", catsError);
    if (itemsError) console.error("Error cargando platillos:", itemsError);

    setCategories((cats as Category[]) || []);
    setItems((menuItems as unknown as MenuItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  const handleDeleteItem = async (id: string) => {
    const confirmDelete = confirm("¿Eliminar este platillo?");
    if (!confirmDelete) return;

    const { error } = await deleteMenuItem(id);
    if (error) {
      alert("No se pudo eliminar el platillo.");
      return;
    }
    await loadData();
  };

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const list = map.get(item.category_id) || [];
      list.push(item);
      map.set(item.category_id, list);
    }
    return map;
  }, [items]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 text-[#061b3a] xl:pb-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <AdminPageHeader
            eyebrow="Menú digital"
            icon={Utensils}
            title="Menú"
            description={`Categorías y platillos del menú de ${activeStore?.name || "la tienda activa"}.`}
            actions={
              <Link
                href="/admin/menu/items/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#061b3a] px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <Plus size={18} />
                Nuevo platillo
              </Link>
            }
          />
        </div>

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
            Cargando menú...
          </div>
        ) : (
          <div className="space-y-5">
            <CategoryManager
              storeId={activeStore!.id}
              categories={categories}
              onChange={loadData}
            />

            {categories.length === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Utensils size={34} />
                </div>
                <h2 className="text-xl font-black">Aún no hay categorías</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Crea la primera categoría arriba, ej: "Alitas & Tenders".
                </p>
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.id} className="rounded-3xl bg-slate-100/60 p-4">
                  <h3 className="mb-3 px-1 text-sm font-black text-slate-700">
                    {category.name}
                  </h3>
                  <div className="space-y-2">
                    {(itemsByCategory.get(category.id) || []).length === 0 ? (
                      <p className="px-1 text-xs font-semibold text-slate-400">
                        Sin platillos en esta categoría todavía.
                      </p>
                    ) : (
                      itemsByCategory
                        .get(category.id)!
                        .map((item) => (
                          <MenuItemCard key={item.id} item={item} onDelete={handleDeleteItem} />
                        ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
