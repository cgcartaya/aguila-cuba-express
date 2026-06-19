"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  ArrowUpDown,
  Filter,
  Upload,
  MoreVertical,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  sku?: string | null;
  name: string;
  category: string;
  description?: string | null;
  price: number;
  stock: number;
  image_url?: string | null;
  tag?: string | null;
  is_active: boolean;
  created_at?: string;
};

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

  function applyQuickFilter(type: "all" | "active" | "inactive" | "low-stock") {
    setSearch("");
    setCategory("all");
    setPage(1);

    if (type === "all") {
      setStatus("all");
      setStockFilter("all");
    }

    if (type === "active") {
      setStatus("active");
      setStockFilter("all");
    }

    if (type === "inactive") {
      setStatus("inactive");
      setStockFilter("all");
    }

    if (type === "low-stock") {
      setStatus("all");
      setStockFilter("low");
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

        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            onClick={() => applyQuickFilter("all")}
            className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:scale-[1.01]"
          >
            <p className="text-xs text-slate-500">Total</p>
            <p className="text-xl font-bold text-slate-900">
              {products.length}
            </p>
          </button>

          <button
            onClick={() => applyQuickFilter("active")}
            className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:scale-[1.01]"
          >
            <p className="text-xs text-slate-500">Activos</p>
            <p className="text-xl font-bold text-green-600">
              {products.filter((p) => p.is_active).length}
            </p>
          </button>

<Link
  href="/admin/products/inactive"
  className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:scale-[1.01]"
>
  <p className="text-xs text-slate-500">Inactivos</p>
  <p className="text-xl font-bold text-slate-500">
    {products.filter((p) => !p.is_active).length}
  </p>
</Link>
<Link
  href="/admin/products/low-stock"
  className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:scale-[1.01]"
>
  <p className="text-xs text-slate-500">Bajo stock</p>
  <p className="text-xl font-bold text-orange-500">
    {products.filter((p) => p.stock <= 5).length}
  </p>
</Link>
        </div>

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
              <div
                key={product.id}
                className="relative rounded-2xl bg-white p-3 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={26} className="text-slate-400" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="line-clamp-1 font-semibold text-slate-900">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          SKU: {product.sku || "Sin SKU"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          product.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {product.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                        {product.category}
                      </span>

                      <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                        ${Number(product.price).toFixed(2)}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 font-semibold ${
                          product.stock <= 5
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        Existencias: {product.stock}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-slate-700"
                      >
                        <Pencil size={15} />
                        Editar
                      </Link>

                      <button
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === product.id ? null : product.id
                          )
                        }
                        className="flex w-14 items-center justify-center rounded-xl border px-3 py-2 text-slate-700"
                      >
                        {openMenuId === product.id ? (
                          <X size={18} />
                        ) : (
                          <MoreVertical size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {openMenuId === product.id && (
                  <div className="mt-3 rounded-xl border bg-slate-50 p-2">
                    <button
                      onClick={() => toggleProductStatus(product)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                        product.is_active
                          ? "text-orange-600 hover:bg-orange-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {product.is_active
                        ? "Desactivar producto"
                        : "Activar producto"}
                    </button>

                    <button
                      onClick={() => deleteProductForever(product.id)}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                      Eliminar definitivamente
                    </button>
                  </div>
                )}
              </div>
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