"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2, Save, Search, Sparkles } from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  getAdminProductsByStoreId,
  updateHomeFeaturedProduct,
} from "@/lib/services/products";
import type { Product } from "@/components/admin/products/types";
import ProductSectionTabs from "@/components/admin/products/ProductSectionTabs";

type Draft = {
  enabled: boolean;
  order: string;
  label: string;
};

type ProductWithImages = Product & {
  product_images?: Array<{ image_url: string; is_main: boolean; position: number | null }> | null;
};

export default function FeaturedProductsAdminPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

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
    setMessage(null);
    const { data, error } = await getAdminProductsByStoreId(activeStore.id);

    if (error) {
      console.error(error);
      setMessage("No se pudieron cargar los productos.");
      setLoading(false);
      return;
    }

    const normalized = ((data || []) as ProductWithImages[]).map((product) => {
      const image =
        product.product_images?.find((item) => item.is_main) ||
        product.product_images?.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
      return { ...product, image_url: image?.image_url || product.image_url };
    });

    setProducts(normalized);
    setDrafts(
      Object.fromEntries(
        normalized.map((product) => [
          product.id,
          {
            enabled: Boolean(product.is_home_featured),
            order: product.home_featured_order?.toString() || "",
            label: product.home_featured_label || "Más vendido",
          },
        ])
      )
    );
    setLoading(false);
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query)
    );
  }, [products, search]);

  const selectedCount = Object.values(drafts).filter((draft) => draft.enabled).length;

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  async function saveProduct(product: Product) {
    if (!activeStore?.id) return;
    const draft = drafts[product.id];
    if (!draft) return;

    const parsedOrder = draft.order.trim() ? Number(draft.order) : null;
    if (parsedOrder !== null && (!Number.isInteger(parsedOrder) || parsedOrder < 1)) {
      setMessage("El orden debe ser un número entero mayor que cero.");
      return;
    }

    setSavingId(product.id);
    setMessage(null);
    const { error } = await updateHomeFeaturedProduct(product.id, activeStore.id, {
      is_home_featured: draft.enabled,
      home_featured_order: draft.enabled ? parsedOrder : null,
      home_featured_label: draft.enabled && draft.label.trim() ? draft.label.trim() : null,
    });

    if (error) {
      console.error(error);
      setMessage(`No se pudo guardar ${product.name}.`);
      setSavingId(null);
      return;
    }

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? {
              ...item,
              is_home_featured: draft.enabled,
              home_featured_order: draft.enabled ? parsedOrder : null,
              home_featured_label: draft.enabled && draft.label.trim() ? draft.label.trim() : null,
            }
          : item
      )
    );
    setMessage(`${product.name} guardado correctamente.`);
    setSavingId(null);
  }

  return (
    <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
      <ProductSectionTabs />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Sparkles size={22} />
            </span>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Más vendidos y destacados</h1>
              <p className="text-sm text-slate-500">Elige manualmente qué productos aparecerán en la portada.</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <span className="font-black text-slate-900">{selectedCount}</span> seleccionados
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Esta primera fase es completamente manual. No cambia órdenes, inventario, checkout ni los destacados de cada categoría.
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nombre, categoría o SKU..."
          className="w-full bg-transparent text-sm outline-none"
        />
      </div>

      {message ? <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">{message}</div> : null}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const draft = drafts[product.id];
            if (!draft) return null;
            return (
              <article key={product.id} className={`rounded-2xl border bg-white p-4 shadow-sm transition ${draft.enabled ? "border-red-300 ring-1 ring-red-100" : "border-slate-200"}`}>
                <div className="grid gap-4 lg:grid-cols-[72px_minmax(220px,1fr)_150px_220px_120px] lg:items-center">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Image src={product.image_url?.trim() || "/placeholder-product.png"} alt={product.name} fill sizes="64px" className="object-contain p-1" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate font-black text-slate-900">{product.name}</h2>
                    <p className="text-xs font-semibold text-slate-500">{product.category} · Stock: {product.stock}</p>
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-bold">
                      <input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft(product.id, { enabled: event.target.checked })} className="h-4 w-4 accent-red-600" />
                      Mostrar en la portada
                    </label>
                  </div>

                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Orden
                    <input type="number" min="1" disabled={!draft.enabled} value={draft.order} onChange={(event) => updateDraft(product.id, { order: event.target.value })} placeholder="1" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-red-400 disabled:bg-slate-100" />
                  </label>

                  <label className="text-xs font-black uppercase tracking-wide text-slate-500">
                    Etiqueta
                    <input disabled={!draft.enabled} value={draft.label} onChange={(event) => updateDraft(product.id, { label: event.target.value })} placeholder="Más vendido" maxLength={40} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold normal-case text-slate-900 outline-none focus:border-red-400 disabled:bg-slate-100" />
                  </label>

                  <button type="button" onClick={() => saveProduct(product)} disabled={savingId === product.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60">
                    {savingId === product.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
                  </button>
                </div>
              </article>
            );
          })}
          {!filteredProducts.length ? <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500">No se encontraron productos.</div> : null}
        </div>
      )}
    </main>
  );
}
