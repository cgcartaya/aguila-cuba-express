"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Loader2, Save, Star } from "lucide-react";

import {
  getAdminProductsByStoreId,
  updateCategoryProductsOrder,
} from "@/lib/services/products";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import type { Product } from "@/components/admin/products/types";

type OrderProduct = Product & {
  category_sort_order?: number | null;
  is_category_featured?: boolean | null;
};

export default function ProductCategoryOrderManager() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const [products, setProducts] = useState<OrderProduct[]>([]);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  useEffect(() => {
    if (accessLoading || storeLoading) return;
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  async function loadProducts() {
    if (!activeStore?.id) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");
    const { data, error } = await getAdminProductsByStoreId(activeStore.id);

    if (error) {
      setProducts([]);
      setMessage("No se pudieron cargar los productos.");
      setLoading(false);
      return;
    }

    const normalized = ((data || []) as OrderProduct[]).map((product) => {
      const mainImage =
        product.product_images?.find((image) => image.is_main) ||
        product.product_images
          ?.slice()
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

      return {
        ...product,
        image_url:
          mainImage?.image_url ||
          product.image_url ||
          "/placeholder-product.png",
        category_sort_order: product.category_sort_order ?? 9999,
        is_category_featured: product.is_category_featured ?? false,
      };
    });

    setProducts(normalized);

    const firstCategory = Array.from(
      new Set(normalized.map((product) => product.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b))[0];

    setCategory((current) =>
      current && normalized.some((product) => product.category === current)
        ? current
        : firstCategory || ""
    );
    setLoading(false);
  }

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((product) => product.category).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [products]
  );

  const categoryProducts = useMemo(() => {
    return products
      .filter((product) => product.category === category)
      .sort(
        (a, b) =>
          Number(Boolean(b.is_category_featured)) -
            Number(Boolean(a.is_category_featured)) ||
          (a.category_sort_order ?? 9999) - (b.category_sort_order ?? 9999) ||
          a.name.localeCompare(b.name)
      );
  }, [products, category]);

  function replaceCategory(nextCategoryProducts: OrderProduct[]) {
    const positions = new Map(
      nextCategoryProducts.map((product, index) => [
        product.id,
        { ...product, category_sort_order: index + 1 },
      ])
    );

    setProducts((current) =>
      current.map((product) => positions.get(product.id) || product)
    );
    setMessage("Cambios pendientes de guardar.");
  }

  function move(productId: string, direction: -1 | 1) {
    const current = [...categoryProducts];
    const index = current.findIndex((product) => product.id === productId);
    const target = index + direction;

    if (index < 0 || target < 0 || target >= current.length) return;

    [current[index], current[target]] = [current[target], current[index]];
    replaceCategory(current);
  }

  function reorderByDrag(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    const current = [...categoryProducts];
    const sourceIndex = current.findIndex((product) => product.id === sourceId);
    const targetIndex = current.findIndex((product) => product.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const [movedProduct] = current.splice(sourceIndex, 1);
    current.splice(targetIndex, 0, movedProduct);
    replaceCategory(current);
  }

  function finishDrag() {
    setDraggedProductId(null);
    setDragOverProductId(null);
  }

  function toggleFeatured(productId: string) {
    const featuredCount = categoryProducts.filter(
      (product) => product.is_category_featured
    ).length;
    const selected = categoryProducts.find((product) => product.id === productId);

    if (!selected) return;

    if (!selected.is_category_featured && featuredCount >= 4) {
      setMessage(
        "Esta categoría ya tiene 4 productos destacados. Desmarca uno antes de agregar otro."
      );
      return;
    }

    const next = categoryProducts.map((product) =>
      product.id === productId
        ? { ...product, is_category_featured: !product.is_category_featured }
        : product
    );

    replaceCategory(next);
  }

  async function save() {
    if (!activeStore?.id || !category) return;

    setSaving(true);
    setMessage("");

    const payload = categoryProducts.map((product, index) => ({
      id: product.id,
      category_sort_order: index + 1,
      is_category_featured: Boolean(product.is_category_featured),
    }));

    const { error } = await updateCategoryProductsOrder(
      activeStore.id,
      category,
      payload
    );

    if (error) {
      setMessage(error.message || "No se pudo guardar el orden.");
      setSaving(false);
      return;
    }

    setProducts((current) =>
      current.map((product) => {
        const saved = payload.find((item) => item.id === product.id);
        return saved ? { ...product, ...saved } : product;
      })
    );
    setMessage("Orden guardado. La tienda pública ya usará esta selección.");
    setSaving(false);
  }

  if (loading || accessLoading || storeLoading) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
        Cargando productos...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-bold text-slate-700">
          Categoría que deseas organizar
        </label>
        <select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setMessage("");
          }}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-900"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <p className="mt-3 text-sm text-slate-500">
          Mantén presionado el icono de puntos y arrastra cada producto. También
          puedes usar las flechas como alternativa. Los productos con estrella
          se mantienen como destacados de esa categoría.
        </p>
      </div>

      {message && (
        <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {categoryProducts.map((product, index) => (
          <div
            key={product.id}
            draggable
            onDragStart={(event) => {
              setDraggedProductId(product.id);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", product.id);
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              if (draggedProductId && draggedProductId !== product.id) {
                setDragOverProductId(product.id);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const sourceId =
                draggedProductId || event.dataTransfer.getData("text/plain");
              if (sourceId) reorderByDrag(sourceId, product.id);
              finishDrag();
            }}
            onDragEnd={finishDrag}
            className={`flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition ${
              draggedProductId === product.id
                ? "border-slate-300 opacity-50"
                : dragOverProductId === product.id
                ? "border-slate-900 ring-2 ring-slate-200"
                : "border-transparent"
            }`}
          >
            <div
              className="flex h-10 w-8 shrink-0 cursor-grab items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
              title="Arrastrar para cambiar el orden"
              aria-label={`Arrastrar ${product.name}`}
            >
              <GripVertical size={20} />
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-700">
              {index + 1}
            </div>

            <img
              src={product.image_url || "/placeholder-product.png"}
              alt={product.name}
              className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 bg-slate-50 object-contain p-1"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = "/placeholder-product.png";
              }}
            />

            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900">{product.name}</p>
              <p className="text-xs text-slate-500">
                {product.is_category_featured
                  ? "Destacado en esta categoría"
                  : "Orden normal"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => toggleFeatured(product.id)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                product.is_category_featured
                  ? "border-amber-300 bg-amber-100 text-amber-700"
                  : "border-slate-200 bg-white text-slate-400"
              }`}
              title="Destacar producto"
            >
              <Star
                size={18}
                fill={product.is_category_featured ? "currentColor" : "none"}
              />
            </button>

            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => move(product.id, -1)}
                disabled={index === 0}
                className="flex h-8 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30"
                title="Subir"
              >
                <ArrowUp size={16} />
              </button>
              <button
                type="button"
                onClick={() => move(product.id, 1)}
                disabled={index === categoryProducts.length - 1}
                className="flex h-8 w-9 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30"
                title="Bajar"
              >
                <ArrowDown size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving || !category}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-bold text-white shadow-sm disabled:opacity-60"
      >
        {saving ? <Loader2 className="animate-spin" size={19} /> : <Save size={19} />}
        {saving ? "Guardando..." : "Guardar orden de la categoría"}
      </button>
    </div>
  );
}
