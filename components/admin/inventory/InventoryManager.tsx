"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  History,
  Pencil,
} from "lucide-react";

import StockModal from "./StockModal";
import StockEntryModal from "./StockEntryModal";

export default function InventoryManager({
  initialProducts,
}: {
  initialProducts: any[];
}) {
  const [products] = useState(initialProducts);
  const [search, setSearch] = useState("");

  const [selectedProduct, setSelectedProduct] =
    useState<any>(null);

  const [entryProduct, setEntryProduct] =
    useState<any>(null);

  const [filter, setFilter] = useState<
    "all" | "low" | "empty"
  >("all");

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
        (p) => p.stock > 0 && p.stock <= 5
      );
    }

    if (filter === "empty") {
      result = result.filter((p) => p.stock === 0);
    }

    return result;
  }, [products, search, filter]);

  const stats = useMemo(() => {
    return {
      total: products.length,

      lowStock: products.filter(
        (p) => p.stock > 0 && p.stock <= 5
      ).length,

      noStock: products.filter((p) => p.stock === 0)
        .length,

      totalValue: products.reduce(
        (acc, p) =>
          acc +
          Number(p.price || 0) *
            Number(p.stock || 0),
        0
      ),
    };
  }, [products]);

  return (
    <>
      {/* BUSCADOR */}

      <div className="mb-5 rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 rounded-2xl border p-3">
          <Search
            size={20}
            className="text-slate-400"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Buscar producto..."
            className="w-full outline-none"
          />
        </div>
      </div>

      {/* ESTADÍSTICAS */}

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

      {/* FILTROS */}

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

      {/* PRODUCTOS */}

      <div className="space-y-3">
        {filteredProducts.map((product) => {
          const mainImage =
            product.product_images?.find(
              (img: any) => img.is_main
            )?.image_url ||
            product.product_images?.[0]?.image_url ||
            "/placeholder-product.png";

          let stockColor =
            "bg-green-100 text-green-700";

          if (product.stock === 0) {
            stockColor =
              "bg-red-100 text-red-700";
          } else if (product.stock <= 5) {
            stockColor =
              "bg-yellow-100 text-yellow-700";
          }

          return (
            <div
              key={product.id}
              className="rounded-3xl bg-white p-4 shadow-sm"
            >
              <div className="flex gap-4">
                {/* IMAGEN */}

                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border bg-slate-50">
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src =
                        "/placeholder-product.png";
                    }}
                  />
                </div>

                {/* INFO */}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-black text-[#061b3a] md:text-base">
                        {product.name}
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        {product.category} • SKU:{" "}
                        {product.sku || "-"}
                      </p>
                    </div>

                    <div
                      className={`w-fit rounded-full px-3 py-1 text-xs font-black ${stockColor}`}
                    >
                      Stock: {product.stock}
                    </div>
                  </div>

                  {/* ACCIONES */}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setEntryProduct(product)
                      }
                      className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"
                    >
                      <Plus size={14} />
                      Entrada
                    </button>

                    <button
                      onClick={() =>
                        setSelectedProduct(product)
                      }
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

      {/* MODAL AJUSTAR */}

      {selectedProduct && (
        <StockModal
          product={selectedProduct}
          onClose={() =>
            setSelectedProduct(null)
          }
        />
      )}

      {/* MODAL ENTRADA */}

      {entryProduct && (
        <StockEntryModal
          product={entryProduct}
          onClose={() => setEntryProduct(null)}
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
      <div
        className={`mb-2 inline-flex rounded-xl px-3 py-2 text-sm font-black ${color}`}
      >
        {value}
      </div>

      <p className="text-sm font-semibold text-slate-500">
        {title}
      </p>
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