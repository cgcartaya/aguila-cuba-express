"use client";

/* =========================================================
   ADMIN - CREAR COMBO

   Esta página solo carga los productos disponibles y entrega
   los datos al formulario principal de combos.
========================================================= */

import { useEffect, useMemo, useState } from "react";

import ComboForm from "@/components/admin/combos/ComboForm";
import { getProductsForCombosByStoreId } from "@/lib/services/products";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

import type { ComboProduct } from "@/components/admin/combos/types";

export default function NewComboPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [products, setProducts] = useState<ComboProduct[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================================================
     CARGAR PRODUCTOS ACTIVOS PARA ARMAR COMBOS
  ========================================================= */

  useEffect(() => {
    const loadProducts = async () => {
      if (accessLoading || storeLoading) return;

      if (!activeStore?.id) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await getProductsForCombosByStoreId(
        activeStore.id
      );

      if (error) {
        console.error("Error cargando productos para combos:", error);
        setLoading(false);
        return;
      }

      setProducts((data as ComboProduct[]) || []);
      setLoading(false);
    };

    loadProducts();
  }, [accessLoading, storeLoading, activeStore?.id]);

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