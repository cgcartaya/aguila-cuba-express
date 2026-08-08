"use client";

/* =========================================================
   REPORTE — PRODUCTOS MÁS VENDIDOS

   Agrega order_items (solo productos, no combos) de las órdenes
   ACTIVAS (no papelera) de la tienda, agrupando por producto:
   cuántas unidades se vendieron y cuánto generaron en ventas.

   Los datos ya existían (cada orden guarda sus order_items desde
   siempre) — lo que faltaba era una vista que los agregara. No
   hay ninguna tabla ni migración nueva aquí.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2, TrendingUp } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { downloadCsv } from "@/lib/utils/csv";

type TopProduct = {
  productId: string;
  name: string;
  quantity: number;
  revenue: number;
};

type SortMode = "quantity" | "revenue";

export default function TopSellingProductsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [products, setProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("quantity");

  useEffect(() => {
    let mounted = true;

    async function loadTopProducts() {
      if (accessLoading || storeLoading) return;

      if (!activeStore?.id) {
        setProducts([]);
        setLoading(false);
        setErrorMessage("No se pudo resolver la tienda activa.");
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      // order_items no tiene store_id propio, así que filtramos por la
      // tienda a través de la orden con !inner (excluye además las
      // órdenes en papelera).
      const { data, error } = await supabase
        .from("order_items")
        .select(
          "product_id, product_name, quantity, subtotal, item_type, orders!inner(store_id, deleted_at)"
        )
        .eq("item_type", "product")
        .eq("orders.store_id", activeStore.id)
        .is("orders.deleted_at", null);

      if (!mounted) return;

      if (error) {
        console.error("Error cargando productos más vendidos:", error);
        setErrorMessage("No se pudo cargar el reporte.");
        setLoading(false);
        return;
      }

      const grouped = new Map<string, TopProduct>();

      for (const row of data || []) {
        const key = row.product_id || row.product_name;
        if (!key) continue;

        const existing = grouped.get(key);
        const quantity = Number(row.quantity || 0);
        const revenue = Number(row.subtotal || 0);

        if (existing) {
          existing.quantity += quantity;
          existing.revenue += revenue;
        } else {
          grouped.set(key, {
            productId: key,
            name: row.product_name || "Producto eliminado",
            quantity,
            revenue,
          });
        }
      }

      setProducts(Array.from(grouped.values()));
      setLoading(false);
    }

    loadTopProducts();

    return () => {
      mounted = false;
    };
  }, [accessLoading, storeLoading, activeStore?.id]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) =>
      sortMode === "quantity"
        ? b.quantity - a.quantity
        : b.revenue - a.revenue
    );
  }, [products, sortMode]);

  const maxValue = useMemo(() => {
    if (sortedProducts.length === 0) return 0;
    return sortMode === "quantity"
      ? sortedProducts[0].quantity
      : sortedProducts[0].revenue;
  }, [sortedProducts, sortMode]);

  function handleExportCsv() {
    downloadCsv(
      `productos-mas-vendidos-${new Date().toISOString().slice(0, 10)}`,
      ["Producto", "Unidades vendidas", "Ventas generadas"],
      sortedProducts.map((p) => [
        p.name,
        p.quantity,
        p.revenue.toFixed(2),
      ])
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black text-[#061b3a]">
              Productos más vendidos
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              De{" "}
              <span className="font-black text-[#061b3a]">
                {activeStore?.name || "la tienda activa"}
              </span>{" "}
              — solo órdenes activas, sin papelera.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={sortedProducts.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={18} />
            Exportar CSV
          </button>
        </div>

        <div className="mb-5 flex gap-2">
          <button
            type="button"
            onClick={() => setSortMode("quantity")}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              sortMode === "quantity"
                ? "bg-[#061b3a] text-white"
                : "bg-white text-slate-600 shadow-sm"
            }`}
          >
            Por unidades
          </button>

          <button
            type="button"
            onClick={() => setSortMode("revenue")}
            className={`rounded-full px-4 py-2 text-sm font-black transition ${
              sortMode === "revenue"
                ? "bg-[#061b3a] text-white"
                : "bg-white text-slate-600 shadow-sm"
            }`}
          >
            Por ventas ($)
          </button>
        </div>

        {loading || accessLoading || storeLoading ? (
          <div className="flex items-center justify-center rounded-3xl bg-white p-10 shadow-sm">
            <Loader2 className="animate-spin text-slate-400" size={28} />
          </div>
        ) : errorMessage ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-bold text-red-600">{errorMessage}</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <TrendingUp className="mx-auto mb-3 text-slate-400" size={40} />
            <h2 className="text-xl font-black text-[#061b3a]">
              Todavía no hay ventas
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Cuando se completen órdenes con productos, van a aparecer aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2 rounded-3xl bg-white p-4 shadow-sm md:p-6">
            {sortedProducts.map((product, index) => {
              const value =
                sortMode === "quantity" ? product.quantity : product.revenue;
              const barWidth =
                maxValue > 0 ? Math.max(4, (value / maxValue) * 100) : 0;

              return (
                <div
                  key={product.productId}
                  className="flex items-center gap-4 rounded-2xl p-3 transition hover:bg-slate-50"
                >
                  <span className="w-6 shrink-0 text-center text-sm font-black text-slate-400">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-black text-[#061b3a] md:text-base">
                        {product.name}
                      </p>

                      <p className="shrink-0 text-sm font-black text-[#061b3a]">
                        {sortMode === "quantity"
                          ? `${product.quantity} uds`
                          : `$${product.revenue.toFixed(2)}`}
                      </p>
                    </div>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#061b3a]"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {sortMode === "quantity"
                        ? `$${product.revenue.toFixed(2)} en ventas`
                        : `${product.quantity} unidades vendidas`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
