"use client";

/* =========================================================
   INVENTORY MANAGER

   Fase 3.6:
   - Recibe productos ya filtrados por store_id.
   - Mantiene estado local para actualizar stock sin depender
     de productos globales.
   - Conserva acciones de entrada, ajuste e historial.
========================================================= */

import { useMemo, useState } from "react";
import { Search, Plus, History, Pencil } from "lucide-react";

import StockModal from "./StockModal";
import StockEntryModal from "./StockEntryModal";

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

export default function InventoryManager({
  initialProducts,
}: {
  initialProducts: InventoryProduct[];
}) {
  const [products, setProducts] = useState<InventoryProduct[]>(
    initialProducts || []
  );

  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<InventoryProduct | null>(null);
  const [entryProduct, setEntryProduct] =
    useState<InventoryProduct | null>(null);
  const [filter, setFilter] = useState<"all" | "low" | "empty">("all");

  function handleStockUpdated(productId: string, newStock: number) {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId
          ? {
              ...product,
              stock: newStock,
            }
          : product
      )
    );
  }

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();

      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
      );
    }

    if (filter === "low") {
      result = result.filter(
        (p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5
      );
    }

    if (filter === "empty") {
      result = result.filter((p) => Number(p.stock || 0) === 0);
    }

    return result;
  }, [products, search, filter]);

  const stats = useMemo(() => {
    return {
      total: products.length,

      lowStock: products.filter(
        (p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5
      ).length,

      noStock: products.filter((p) => Number(p.stock || 0) === 0).length,

      totalValue: products.reduce(
        (acc, p) => acc + Number(p.price || 0) * Number(p.stock || 0),
        0
      ),
    };
  }, [products]);

  return (
    <>
      <div className="mb-5 rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-2xl border p-3">
          <Search size={20} className="text-slate-400" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full outline-none"
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Productos"
          value={stats.total}
          color="bg-blue-100 text-blue-700"
        />

        <StatCard
          title="Bajo stock"
          value={stats.lowStock}
          color="bg-yellow-100 text-yellow-700"
        />

        <StatCard
          title="Sin stock"
          value={stats.noStock}
          color="bg-red-100 text-red-700"
        />

        <StatCard
          title="Valor"
          value={`$${stats.totalValue.toFixed(0)}`}
          color="bg-green-100 text-green-700"
        />
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        <FilterButton
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label="Todos"
        />

        <FilterButton
          active={filter === "low"}
          onClick={() => setFilter("low")}
          label="Bajo stock"
        />

        <FilterButton
          active={filter === "empty"}
          onClick={() => setFilter("empty")}
          label="Sin stock"
        />
      </div>

      <div className="space-y-3">
        {filteredProducts.map((product) => {
          const mainImage =
            product.product_images?.find((img) => img.is_main)?.image_url ||
            product.product_images
              ?.slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]
              ?.image_url ||
            "/placeholder-product.png";

          let stockColor = "bg-green-100 text-green-700";

          if (Number(product.stock || 0) === 0) {
            stockColor = "bg-red-100 text-red-700";
          } else if (Number(product.stock || 0) <= 5) {
            stockColor = "bg-yellow-100 text-yellow-700";
          }

          return (
            <div
              key={product.id}
              className="rounded-3xl bg-white p-4 shadow-sm"
            >
              <div className="flex gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-slate-50">
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder-product.png";
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-black text-[#061b3a] md:text-base">
                        {product.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {product.category || "Sin categoría"} • SKU:{" "}
                        {product.sku || "-"}
                      </p>
                    </div>

                    <div
                      className={`w-fit rounded-full px-3 py-1 text-xs font-black ${stockColor}`}
                    >
                      Stock: {Number(product.stock || 0)}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setEntryProduct(product)}
                      className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"
                    >
                      <Plus size={14} />
                      Entrada
                    </button>

                    <button
                      onClick={() => setSelectedProduct(product)}
                      className="flex items-center gap-1 rounded-xl bg-[#061b3a] px-3 py-2 text-xs font-bold text-white"
                    >
                      <Pencil size={14} />
                      Ajustar
                    </button>

                    <button className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold">
                      <History size={14} />
                      Historial
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-black text-[#061b3a]">
            No hay productos para mostrar
          </h2>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Ajusta la búsqueda o revisa los productos de esta tienda.
          </p>
        </div>
      )}

      {selectedProduct && (
        <StockModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {entryProduct && (
        <StockEntryModal
          product={entryProduct}
          onClose={() => setEntryProduct(null)}
          onSaved={(newStock) => {
            handleStockUpdated(entryProduct.id, newStock);
            setEntryProduct(null);
          }}
        />
      )}
    </>
  );
}

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm">
      <div className={`mb-2 inline-flex rounded-xl px-3 py-2 text-sm font-black ${color}`}>
        {value}
      </div>

      <p className="text-sm font-semibold text-slate-500">{title}</p>
    </div>
  );
}

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
        active
          ? "bg-[#061b3a] text-white"
          : "bg-white text-slate-600 shadow-sm"
      }`}
    >
      {label}
    </button>
  );
}
