"use client";

/* =========================================================
   ADMIN - INVENTARIO

   Fase 3.6 - Inventario multiempresa

   Cambio principal:
   - Ya no consulta todos los productos globalmente.
   - Resuelve la tienda correcta según el rol:
     Super Admin  -> usa tienda activa del StoreContext.
     Store Owner  -> usa tienda asignada desde store_users.
   - Carga inventario filtrado por store_id.
========================================================= */

import { useEffect, useMemo, useState } from "react";

import InventoryManager from "@/components/admin/inventory/InventoryManager";
import { getInventoryProductsByStoreId } from "@/lib/services/products";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

type InventoryProductImage = {
  image_url: string;
  is_main: boolean | null;
  position: number | null;
};

export type InventoryProduct = {
  id: string;
  name: string;
  stock: number | null;
  sku?: string | null;
  category?: string | null;
  price: number | null;
  is_active: boolean | null;
  store_id: string;
  product_images?: InventoryProductImage[] | null;
};

export default function InventoryPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();

  const { store: selectedStore } = useStore();

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeStore = useMemo(() => {
    if (isSuperAdmin) {
      return selectedStore || accessStore;
    }

    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  useEffect(() => {
    let mounted = true;

    async function loadInventory() {
      if (accessLoading) return;

      if (!activeStore?.id) {
        setProducts([]);
        setLoadingProducts(false);
        setErrorMessage("No se pudo resolver la tienda activa.");
        return;
      }

      setLoadingProducts(true);
      setErrorMessage(null);

      const { data, error } = await getInventoryProductsByStoreId(
        activeStore.id
      );

      if (!mounted) return;

      if (error) {
        console.error("Error cargando inventario:", error);
        setProducts([]);
        setErrorMessage("Error cargando inventario.");
        setLoadingProducts(false);
        return;
      }

      setProducts((data as InventoryProduct[]) || []);
      setLoadingProducts(false);
    }

    loadInventory();

    return () => {
      mounted = false;
    };
  }, [accessLoading, activeStore?.id]);

  if (accessLoading || loadingProducts) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
            Cargando inventario...
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-black text-[#061b3a]">
              Inventario no disponible
            </h1>

            <p className="mt-2 text-sm font-semibold text-red-600">
              {errorMessage}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#061b3a]">
            Inventario
          </h1>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Controla existencias y movimientos de{" "}
            <span className="font-black text-[#061b3a]">
              {activeStore?.name || "la tienda activa"}
            </span>
            .
          </p>
        </div>

        <InventoryManager initialProducts={products} />
      </div>
    </main>
  );
}
