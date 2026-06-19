"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Package,
  ArrowUpDown,
  Filter,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/admin/products/ProductCard";
import ProductActionsMenu from "@/components/admin/products/ProductActionsMenu";
import ProductStats from "@/components/admin/products/ProductStats";
import type { Product } from "@/components/admin/products/types";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const pageSize = 8;

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando productos:", error.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  async function toggleProductStatus(product: Product) {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active })
      .eq("id", product.id);

    if (error) {
      alert("Error actualizando el producto");
      return;
    }

    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, is_active: !p.is_active } : p
      )
    );

    setOpenMenuId(null);
  }

  async function deleteProductForever(id: string) {
    const confirmed = confirm(
      "Esto eliminará el producto definitivamente. ¿Seguro?"
    );

    if (!confirmed) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      alert("Error eliminando producto");
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    setOpenMenuId(null);
  }

  function applyQuickFilter(type: "all" | "active") {
    setSearch("");
    setCategory("all");
    setStockFilter("all");
    setPage(1);

    if (type === "all") {
      setStatus("all");
    }

    if (type === "active") {
      setStatus("active");
    }
  }

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
      );
    }

    if (category !== "all") {
      result = result.filter((p) => p.category === category);
    }

    if (status !== "all") {
      result = result.filter((p) =>
        status === "active" ? p.is_active : !p.is_active
      );
    }

    if (stockFilter === "low") {
      result = result.filter((p) => p.stock <= 5);
    }

    result.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "stock-high") return b.stock - a.stock;
      if (sortBy === "stock-low") return a.stock - b.stock;
      return 0;
    });

    return result;
  }, [products, search, category, status, sortBy, stockFilter]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, category, status, sortBy, stockFilter]);

  const activeFilters =
    (category !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (stockFilter === "low" ? 1 : 0);

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <section className="mx-auto max-w-6xl px-4 py-5">
        <div className="mb-5">
          <p className="text-sm text-slate-500">Administración</p>
          <h1 className="text-3xl font-bold text-slate-900">Productos</h1>
          <p className="text-sm text-slate-500">
            Gestiona tu catálogo, stock y disponibilidad.
          </p>
        </div>

        <ProductStats products={products} onQuickFilter={applyQuickFilter} />

        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setStockFilter("all");
              }}
              placeholder="Buscar producto..."
              className="w-full bg-transparent text-sm outline-none"
            />

            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <Filter size={15} />
              Filtros {activeFilters > 0 ? `(${activeFilters})` : ""}
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setStockFilter("all");
                  }}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setStockFilter("all");
                }}
                className="rounded-xl border px-3 py-2 text-sm outline-none"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>

              <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
                <ArrowUpDown size={16} className="text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  <option value="newest">Más recientes</option>
                  <option value="name">Nombre A-Z</option>
                  <option value="price-high">Precio mayor</option>
                  <option value="price-low">Precio menor</option>
                  <option value="stock-high">Stock mayor</option>
                  <option value="stock-low">Stock menor</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 flex gap-3">
          <Link
            href="/admin/products/import"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm"
          >
            <Upload size={18} />
            Importar Excel
          </Link>

          <Link
            href="/admin/products/new"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
          >
            <Plus size={18} />
            Nuevo producto
          </Link>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            Cargando productos...
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Package className="mx-auto mb-3 text-slate-400" size={36} />
            <h2 className="font-semibold text-slate-800">
              No hay productos encontrados
            </h2>
            <p className="text-sm text-slate-500">
              Prueba cambiando los filtros o agrega un producto nuevo.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedProducts.map((product) => (
              <ProductCard key={product.id} product={product}>
                <ProductActionsMenu
                  product={product}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  onToggleStatus={toggleProductStatus}
                  onDeleteForever={deleteProductForever}
                />
              </ProductCard>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Anterior
            </button>

            <p className="text-sm text-slate-500">
              {page} / {totalPages}
            </p>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
    </main>
  );
}