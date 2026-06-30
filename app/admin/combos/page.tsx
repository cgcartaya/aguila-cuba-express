"use client";

/* =========================================================
   ADMIN - COMBOS
   Página principal para gestionar combos de productos.
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
  price: number;
};

type ComboItem = {
  id: string;
  quantity: number;
  product_id: string;
  products: ComboProduct;
};

type Combo = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  is_active: boolean;
  combo_items?: ComboItem[];
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
        *,
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

    setCombos((data as Combo[]) || []);
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
            <h1 className="text-3xl font-black">
              Combos
            </h1>

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

        {loading && (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
            Cargando combos...
          </div>
        )}

        {!loading && combos.length === 0 && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Package size={32} />
            </div>

            <h2 className="text-xl font-black">
              No hay combos todavía
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
              Crea combos seleccionando productos existentes. Cuando se venda
              un combo, luego descontaremos automáticamente el inventario de
              cada producto incluido.
            </p>

            <Link
              href="/admin/combos/new"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
            >
              <Plus size={18} />
              Crear primer combo
            </Link>
          </div>
        )}

        {!loading && combos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
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