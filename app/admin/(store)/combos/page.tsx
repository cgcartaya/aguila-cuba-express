"use client";

/* =========================================================
   ADMIN - COMBOS MULTITIENDA
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Package } from "lucide-react";

import ComboCard from "@/components/admin/combos/ComboCard";
import { getCombosByStoreId, deleteCombo } from "@/lib/services/combos";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

type ComboProduct = {
  id: string;
  name: string;
  price: number | string | null;
};

type ComboProductRelation = ComboProduct | ComboProduct[] | null;

type ComboItem = {
  id: string;
  quantity: number | null;
  product_id: string;
  products: ComboProductRelation;
};

type Combo = {
  id: string;
  store_id?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number | string | null;
  is_active: boolean | null;
  combo_items?: ComboItem[] | null;
};

export default function AdminCombosPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCombos = async () => {
    if (accessLoading || storeLoading) return;

    if (!activeStore?.id) {
      setCombos([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await getCombosByStoreId(activeStore.id);

    if (error) {
      console.error("Error cargando combos:", error);
      setLoading(false);
      return;
    }

    setCombos((data as unknown as Combo[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCombos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  const handleDelete = async (comboId: string) => {
    const confirmDelete = confirm("¿Seguro que quieres eliminar este combo?");
    if (!confirmDelete) return;

    const { error } = await deleteCombo(comboId);

    if (error) {
      console.error("Error eliminando combo:", error);
      alert("No se pudo eliminar el combo.");
      return;
    }

    await loadCombos();
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 text-[#061b3a] xl:pb-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black">Combos</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Crea paquetes de productos para {activeStore?.name || "la tienda activa"}.
            </p>
          </div>

          <Link
            href="/admin/combos/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700"
          >
            <Plus size={18} />
            Nuevo combo
          </Link>
        </div>

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
            Cargando combos...
          </div>
        ) : combos.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Package size={34} />
            </div>

            <h2 className="text-xl font-black">No hay combos creados</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Crea el primer combo para esta tienda.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {combos.map((combo) => (
              <ComboCard key={combo.id} combo={combo} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
