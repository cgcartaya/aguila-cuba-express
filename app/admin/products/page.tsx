"use client";

/* =========================================================
   IMPORTS
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import {
  getProducts,
  toggleProductStatus as toggleProductStatusService,
  deleteProductForever as deleteProductForeverService,
} from "@/lib/services/products";

import ProductCard from "@/components/admin/products/ProductCard";
import ProductActionsMenu from "@/components/admin/products/ProductActionsMenu";
import ProductStats from "@/components/admin/products/ProductStats";
import ProductFilters from "@/components/admin/products/ProductFilters";
import ProductPagination from "@/components/admin/products/ProductPagination";
import ProductsEmptyState from "@/components/admin/products/ProductsEmptyState";

import type { Product } from "@/components/admin/products/types";

/* =========================================================
   TIPOS - IMÁGENES DEL PRODUCTO
========================================================= */

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type ProductWithImages = Product & {
  product_images?: ProductImage[];
};

/* =========================================================
   ADMIN PRODUCTS PAGE
========================================================= */

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

  /* =========================================================
     PRODUCTOS - CARGA INICIAL
  ========================================================= */

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);

    const { data, error } = await getProducts();

    if (error) {
      console.error("Error cargando productos:", error.message);
      setProducts([]);
      setLoading(false);
      return;
    }

    /*
      ADMIN - IMAGEN PRINCIPAL

      El admin ahora usa el nuevo sistema de imágenes:
      product_images.is_main

      Fallback:
      Si el producto aún tiene image_url antiguo,
      lo usamos temporalmente para no romper productos anteriores.
    */

    const productsWithMainImage =
      (data as ProductWithImages[])?.map((product) => {
        const mainImage =
          product.product_images?.find((img) => img.is_main) ||
          product.product_images
            ?.slice()
            .sort(
              (a, b) => (a.position ?? 0) - (b.position ?? 0)
            )[0];

        return {
          ...product,
          image_url: mainImage?.image_url || product.image_url,
        };
      }) || [];

    setProducts(productsWithMainImage);
    setLoading(false);
  }

  /* =========================================================
     PRODUCTOS - ACTIVAR / DESACTIVAR
  ========================================================= */

  async function toggleProductStatus(product: Product) {
    const { error } = await toggleProductStatusService(product);

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

  /* =========================================================
     PRODUCTOS - ELIMINAR DEFINITIVAMENTE
  ========================================================= */

  async function deleteProductForever(id: string) {
    const confirmed = confirm(
      "Esto eliminará el producto definitivamente. ¿Seguro?"
    );

    if (!confirmed) return;

    const { error } = await deleteProductForeverService(id);

    if (error) {
      alert("Error eliminando producto");
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    setOpenMenuId(null);
  }

  /* =========================================================
     FILTROS RÁPIDOS
  ========================================================= */

  function applyQuickFilter(type: "all" | "active") {
    setSearch("");
    setCategory("all");
    setStockFilter("all");
    setPage(1);

    setStatus(type === "active" ? "active" : "all");
  }

  /* =========================================================
     CATEGORÍAS DISPONIBLES
  ========================================================= */

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    );
  }, [products]);

  /* =========================================================
     PRODUCTOS - FILTRADO Y ORDENAMIENTO
  ========================================================= */

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

  /* =========================================================
     PAGINACIÓN
  ========================================================= */

  const totalPages = Math.ceil(filteredProducts.length / pageSize);

  const paginatedProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [search, category, status, sortBy, stockFilter]);

  /* =========================================================
     CONTADOR DE FILTROS ACTIVOS
  ========================================================= */

  const activeFilters =
    (category !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (stockFilter === "low" ? 1 : 0);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <section className="mx-auto max-w-6xl px-4 py-5">
        {/* HEADER */}

        <div className="mb-5">
          <p className="text-sm text-slate-500">Administración</p>

          <h1 className="text-3xl font-bold text-slate-900">
            Productos
          </h1>

          <p className="text-sm text-slate-500">
            Gestiona tu catálogo, stock y disponibilidad.
          </p>
        </div>

        {/* ESTADÍSTICAS */}

        <ProductStats
          products={products}
          onQuickFilter={applyQuickFilter}
        />

        {/* FILTROS */}

        <ProductFilters
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          status={status}
          setStatus={setStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
          stockFilter={stockFilter}
          setStockFilter={setStockFilter}
          categories={categories}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          activeFilters={activeFilters}
        />

        {/* ACCIONES PRINCIPALES */}

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

        {/* LISTADO */}

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            Cargando productos...
          </div>
        ) : paginatedProducts.length === 0 ? (
          <ProductsEmptyState />
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

        {/* PAGINACIÓN */}

        <ProductPagination
          page={page}
          totalPages={totalPages}
          setPage={setPage}
        />
      </section>
    </main>
  );
}