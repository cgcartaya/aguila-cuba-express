"use client";

/* =========================================================
   ADMIN - COMBOS
   Página principal para gestionar combos de productos.

   Corrección:
   - Tipos preparados para relaciones de Supabase como objeto o array.
   - Consulta filtrada por store_id cuando hay tienda activa.
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";

import ComboCard from "@/components/admin/combos/ComboCard";

/* =========================================================
   TIPOS
========================================================= */

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

/* =========================================================
   PAGE
========================================================= */

export default function AdminCombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  const getCurrentStoreId = () => {
    if (typeof window === "undefined") return null;

    const savedStore = localStorage.getItem("saas-current-store");

    if (!savedStore) return null;

    try {
      const currentStore = JSON.parse(savedStore);
      return currentStore?.id || null;
    } catch {
      return null;
    }
  };

  /* =========================================================
     CARGAR COMBOS DE LA TIENDA SELECCIONADA
  ========================================================= */

  const loadCombos = async () => {
    setLoading(true);

    const currentStoreId = getCurrentStoreId();

    let query = supabase
      .from("combos")
      .select(`
        id,
        store_id,
        name,
        description,
        image_url,
        price,
        is_active,
        created_at,
        combo_items (
          id,
          quantity,
          product_id,
          products (
            id,
            name,
            price
          )
        )
      `)
      .is("deleted_at", null);

    if (currentStoreId) {
      query = query.eq("store_id", currentStoreId);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

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
  }, []);

  /* =========================================================
     ELIMINAR COMBO
  ========================================================= */

  const handleDelete = async (comboId: string) => {
    const confirmDelete = confirm(
      "¿Seguro que quieres eliminar este combo?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("combos")
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq("id", comboId);

    if (error) {
      console.error("Error eliminando combo:", error);
      alert("No se pudo eliminar el combo.");
      return;
    }

    await loadCombos();
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black">Combos</h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Crea paquetes de productos que descuentan inventario real.
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

        {loading ? (
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
              Crea tu primer combo combinando productos existentes.
            </p>

            <Link
              href="/admin/combos/new"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700"
            >
              <Plus size={18} />
              Crear combo
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {combos.map((combo) => (
              <ComboCard
                key={combo.id}
                combo={combo}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
