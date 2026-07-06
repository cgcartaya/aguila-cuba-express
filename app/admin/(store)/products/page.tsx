"use client";

/* =========================================================
   ADMIN PRODUCTS PAGE

   Fase papelera completa:
   - Productos filtrados por tienda activa.
   - Contador de papelera por tienda.
   - Mover a papelera con servicio centralizado.
   - No elimina definitivamente desde el listado.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

import {
  getAdminProductsByStoreId,
  getTrashProductsCountByStoreId,
  moveProductToTrashByStoreId,
  toggleProductStatus as toggleProductStatusService,
} from "@/lib/services/products";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

import ProductCard from "@/components/admin/products/ProductCard";
import ProductActionsMenu from "@/components/admin/products/ProductActionsMenu";
import ProductStats from "@/components/admin/products/ProductStats";
import ProductFilters from "@/components/admin/products/ProductFilters";
import ProductPagination from "@/components/admin/products/ProductPagination";
import ProductsEmptyState from "@/components/admin/products/ProductsEmptyState";

import type { Product } from "@/components/admin/products/types";

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type ProductWithImages = Product & {
  product_images?: ProductImage[];
};

export default function AdminProductsPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();

  const { store: selectedStore, loading: storeLoading } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [trashCount, setTrashCount] = useState(0);
  const [movingToTrashId, setMovingToTrashId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pageSize = 8;

  const activeStore = useMemo(() => {
    if (isSuperAdmin) {
      return selectedStore || accessStore;
    }

    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  async function fetchProducts() {
    if (accessLoading || storeLoading) return;

    setLoading(true);
    setErrorMessage(null);

    if (!activeStore?.id) {
      setProducts([]);
      setTrashCount(0);
      setErrorMessage("No se pudo resolver la tienda activa.");
      setLoading(false);
      return;
    }

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      getAdminProductsByStoreId(activeStore.id),
      getTrashProductsCountByStoreId(activeStore.id),
    ]);

    if (error) {
      console.error("Error cargando productos:", error);
      setProducts([]);
      setErrorMessage("Error cargando productos.");
      setLoading(false);
      return;
    }

    if (countError) {
      console.error("Error cargando contador de papelera:", countError);
    }

    const productsWithMainImage =
      (data as ProductWithImages[])?.map((product) => {
        const mainImage =
          product.product_images?.find((img) => img.is_main) ||
          product.product_images
            ?.slice()
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

        return {
          ...product,
          image_url: mainImage?.image_url || product.image_url,
        };
      }) || [];

    setProducts(productsWithMainImage);
    setTrashCount(count || 0);
    setLoading(false);
  }

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

  async function moveProductToTrash(id: string) {
    const confirmed = confirm("¿Mover este producto a la papelera?");

    if (!confirmed) return;

    if (!activeStore?.id) {
      alert("No se pudo resolver la tienda activa.");
      return;
    }

    setMovingToTrashId(id);

    const { error } = await moveProductToTrashByStoreId(id, activeStore.id);

    if (error) {
      alert("Error moviendo producto a la papelera");
      setMovingToTrashId(null);
      return;
    }

    setProducts((prev) => prev.filter((p) => p.id !== id));
    setTrashCount((prev) => prev + 1);
    setMovingToTrashId(null);
    setOpenMenuId(null);
  }

  function applyQuickFilter(type: "all" | "active") {
    setSearch("");
    setCategory("all");
    setStockFilter("all");
    setPage(1);
    setStatus(type === "active" ? "active" : "all");
  }

  const categories = useMemo(() => {
    return Array.from(
      new Set(products.map((p) => p.category).filter(Boolean))
    );
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
    <main className="min-h-screen bg-slate-50 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <section className="mx-auto max-w-6xl px-4 py-5">
        <div className="mb-5">
          <p className="text-sm text-slate-500">Administración</p>

          <h1 className="text-3xl font-bold text-slate-900">Productos</h1>

          <p className="text-sm text-slate-500">
            Gestiona el catálogo de{" "}
            <span className="font-black text-[#061b3a]">
              {activeStore?.name || "la tienda activa"}
            </span>
            .
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {errorMessage}
          </div>
        )}

        <ProductStats products={products} onQuickFilter={applyQuickFilter} />

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

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/admin/products/import"
            className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm"
          >
            <Upload size={18} />
            Importar Excel
          </Link>

          <Link
            href="/admin/trash"
            className="relative flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-red-600 shadow-sm"
          >
            <Trash2 size={18} />
            Papelera
            {trashCount > 0 && (
              <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-black text-white">
                {trashCount}
              </span>
            )}
          </Link>

          <Link
            href="/admin/products/new"
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm"
          >
            <Plus size={18} />
            Nuevo producto
          </Link>
        </div>

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#061b3a]" />
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
                  onMoveToTrash={moveProductToTrash}
                  disabled={movingToTrashId === product.id}
                />
              </ProductCard>
            ))}
          </div>
        )}

        <ProductPagination
          page={page}
          totalPages={totalPages}
          setPage={setPage}
        />
      </section>
    </main>
  );
}
