"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  Grid2X2,
  Lightbulb,
  Plus,
  QrCode,
  Search,
  Sparkles,
  Utensils,
  UtensilsCrossed,
} from "lucide-react";

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

type Category = {
  id: string;
  name: string;
  venue_type: "bar" | "restaurant" | "general";
  sort_order: number;
  is_active: boolean;
};

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
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

    const nextCategories = (cats as Category[]) || [];
    setCategories(nextCategories);
    setItems((menuItems as unknown as MenuItem[]) || []);
    setSelectedCategoryId((current) =>
      current && nextCategories.some((category) => category.id === current)
        ? current
        : nextCategories[0]?.id || null
    );
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

  const selectedCategory =
    categories.find((category) => category.id === selectedCategoryId) || categories[0] || null;

  const categoryItems = useMemo(() => {
    if (!selectedCategory) return [];
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (item.category_id !== selectedCategory.id) return false;
      if (!q) return true;
      return `${item.name} ${item.description || ""}`.toLowerCase().includes(q);
    });
  }, [items, search, selectedCategory]);

  const activeItems = items.filter((item) => item.is_active).length;
  const hiddenItems = items.length - activeItems;
  const featuredItems = items.filter((item) => item.is_featured).length;

  return (
    <main className="min-h-screen bg-[#F7F9FC] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 text-[#0B1D35] xl:pb-8">
      <div className="mx-auto max-w-[1240px]">
        <AdminPageHeader
          eyebrow="Menú digital"
          icon={Utensils}
          title="Categorías y platillos"
          description={`Organiza las categorías de ${activeStore?.name || "tu restaurante"} y administra tus platillos.`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin/menu/qr" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm hover:shadow-md">
                <QrCode size={17} /> Códigos QR
              </Link>
              <Link href="/admin/menu/items/new" className="inline-flex items-center gap-2 rounded-xl bg-[#071B35] px-5 py-2.5 text-sm font-black text-white shadow-sm hover:-translate-y-0.5 hover:shadow-md">
                <Plus size={17} /> Nuevo platillo
              </Link>
            </div>
          }
        />

        {loading || accessLoading || storeLoading ? (
          <div className="mt-5 rounded-3xl bg-white p-10 text-center text-sm font-semibold text-slate-500 shadow-sm">Cargando menú...</div>
        ) : (
          <>
            <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { icon: Grid2X2, label: "Categorías", value: categories.length, note: `${categories.filter(c=>c.is_active).length} activas`, tone: "bg-violet-100 text-violet-600" },
                { icon: UtensilsCrossed, label: "Platillos", value: items.length, note: `${activeItems} activos`, tone: "bg-orange-100 text-orange-600" },
                { icon: CheckCircle2, label: "Disponibles", value: activeItems, note: `${featuredItems} destacados`, tone: "bg-emerald-100 text-emerald-600" },
                { icon: Eye, label: "No disponibles", value: hiddenItems, note: "Ocultos del menú", tone: "bg-blue-100 text-blue-600" },
              ].map(({icon: Icon,label,value,note,tone}) => (
                <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_6px_22px_rgba(15,23,42,.04)]">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon size={21}/></div>
                    <div><p className="text-xs font-bold text-slate-500">{label}</p><p className="text-2xl font-black text-[#071B35]">{value}</p></div>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-400">{note}</p>
                </div>
              ))}
            </section>

            {categories.length === 0 ? (
              <div className="mt-5 rounded-3xl bg-white p-10 text-center shadow-sm">
                <Utensils size={34} className="mx-auto text-slate-300"/>
                <h2 className="mt-3 text-xl font-black">Aún no hay categorías</h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">Crea tu primera categoría para comenzar a organizar la carta.</p>
              </div>
            ) : (
              <section className="mt-5 grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
                <CategoryManager
                  storeId={activeStore!.id}
                  categories={categories}
                  selectedCategoryId={selectedCategory?.id || null}
                  onSelect={setSelectedCategoryId}
                  onChange={loadData}
                />

                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-black text-[#071B35]">
                        Platillos en <span className="text-[#635BFF]">{selectedCategory?.name}</span>
                        <span className="ml-2 text-sm font-bold text-slate-400">({categoryItems.length})</span>
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">Edita precio, visibilidad y detalles sin perderte entre categorías.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="relative min-w-[210px] flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                        <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar platillo..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm font-semibold outline-none focus:border-orange-300"/>
                      </label>
                      <Link href="/admin/menu/items/new" className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF641F] px-4 py-2.5 text-sm font-black text-white shadow-sm">
                        <Plus size={16}/> Nuevo platillo
                      </Link>
                    </div>
                  </div>

                  <div className="hidden grid-cols-[minmax(0,1fr)_90px_110px_110px] gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 text-[10px] font-black uppercase tracking-wide text-slate-400 md:grid">
                    <span>Platillo</span><span>Precio</span><span>Estado</span><span className="text-right">Acciones</span>
                  </div>

                  <div className="divide-y divide-slate-100 px-3 sm:px-4">
                    {categoryItems.length === 0 ? (
                      <div className="p-10 text-center text-sm font-semibold text-slate-400">No encontramos platillos en esta categoría.</div>
                    ) : categoryItems.map((item) => (
                      <MenuItemCard key={item.id} item={item} onDelete={handleDeleteItem}/>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className="mt-5 rounded-3xl border border-orange-100 bg-gradient-to-r from-orange-50 to-white p-5">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600"><Lightbulb size={19}/></div>
                <div>
                  <div className="flex items-center gap-2"><h3 className="font-black">Consejos rápidos</h3><Sparkles size={14} className="text-orange-500"/></div>
                  <div className="mt-2 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3">
                    <p><strong className="text-slate-700">Categorías:</strong> organízalas por Restaurante, Bar o General.</p>
                    <p><strong className="text-slate-700">Destacados:</strong> resalta tus platos más importantes.</p>
                    <p><strong className="text-slate-700">Disponibilidad:</strong> oculta temporalmente sin eliminar el platillo.</p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
