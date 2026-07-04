"use client";

/* =========================================================
   ADMIN - CREAR COMBO

   Esta página solo carga los productos disponibles y entrega
   los datos al formulario principal de combos.
========================================================= */

import { useEffect, useState } from "react";

import ComboForm from "@/components/admin/combos/ComboForm";
import { getProductsForCombos } from "@/lib/services/products";

import type { ComboProduct } from "@/components/admin/combos/types";

export default function NewComboPage() {
  const [products, setProducts] = useState<ComboProduct[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================================================
     CARGAR PRODUCTOS ACTIVOS PARA ARMAR COMBOS
  ========================================================= */

  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await getProductsForCombos();

      if (error) {
        console.error("Error cargando productos para combos:", error);
        setLoading(false);
        return;
      }

      setProducts((data as ComboProduct[]) || []);
      setLoading(false);
    };

    loadProducts();
  }, []);

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-500">
        Cargando productos...
      </main>
    );
  }

  /* =========================================================
     EMPTY STATE
  ========================================================= */

  if (products.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-center">
        <h1 className="text-2xl font-black text-[#061b3a]">
          No hay productos disponibles
        </h1>

        <p className="mt-2 text-sm font-semibold text-slate-500">
          Primero debes crear productos activos para poder construir combos.
        </p>
      </main>
    );
  }

  /* =========================================================
     FORMULARIO PRINCIPAL
  ========================================================= */

  return <ComboForm products={products} />;
}