"use client";

/* =========================================================
   ADMIN TRASH PAGE

   Papelera multiempresa:
   - Lista solo productos eliminados de la tienda activa.
   - Búsqueda local.
   - Restaurar producto.
   - Eliminar definitivamente producto + imágenes + Storage.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  deleteProductForeverByStoreId,
  getTrashProductsByStoreId,
  restoreProductByStoreId,
} from "@/lib/services/products";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

type TrashProductImage = {
  image_url: string;
  is_main: boolean | null;
  position: number | null;
};

type TrashProduct = {
  id: string;
  name: string;
  category: string | null;
  price: number | null;
  stock: number | null;
  sku?: string | null;
  is_active: boolean | null;
  store_id: string;
  deleted_at: string | null;
  product_images?: TrashProductImage[] | null;
};

type PendingAction =
  | {
      type: "restore";
      product: TrashProduct;
    }
  | {
      type: "delete";
      product: TrashProduct;
    }
  | null;

export default function TrashPage() {
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();

  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) {
      return selectedStore || accessStore;
    }

    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  const [products, setProducts] = useState<TrashProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  async function loadTrash() {
    if (accessLoading || storeLoading) return;

    setLoading(true);
    setErrorMessage(null);

    if (!activeStore?.id) {
      setProducts([]);
      setErrorMessage("No se pudo resolver la tienda activa.");
      setLoading(false);
      return;
    }

    const { data, error } = await getTrashProductsByStoreId(activeStore.id);

    if (error) {
      console.error("Error cargando papelera:", error);
      setProducts([]);
      setErrorMessage("Error cargando papelera.");
      setLoading(false);
      return;
    }

    setProducts((data as TrashProduct[]) || []);
    setLoading(false);
  }

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return products;

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(q) ||
        product.category?.toLowerCase().includes(q) ||
        product.sku?.toLowerCase().includes(q)
      );
    });
  }, [products, query]);

  const totalStock = useMemo(() => {
    return products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  }, [products]);

  async function runPendingAction() {
    if (!pendingAction || !activeStore?.id) return;

    const productId = pendingAction.product.id;

    setActionLoadingId(productId);

    if (pendingAction.type === "restore") {
      const { error } = await restoreProductByStoreId(productId, activeStore.id);

      if (error) {
        alert("Error restaurando producto");
        setActionLoadingId(null);
        return;
      }

      setProducts((prev) => prev.filter((product) => product.id !== productId));
      setActionLoadingId(null);
      setPendingAction(null);
      return;
    }

    const { error } = await deleteProductForeverByStoreId(
      productId,
      activeStore.id
    );

    if (error) {
      alert("Error eliminando producto definitivamente");
      setActionLoadingId(null);
      return;
    }

    setProducts((prev) => prev.filter((product) => product.id !== productId));
    setActionLoadingId(null);
    setPendingAction(null);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-[calc(9rem+env(safe-area-inset-bottom))] md:p-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/products"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600"
        >
          <ArrowLeft size={18} />
          Volver a productos
        </Link>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold text-red-600">Administración</p>
              <h1 className="text-3xl font-black text-[#061b3a]">
                Papelera
              </h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Productos eliminados de {activeStore?.name || "la tienda activa"}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <StatPill label="Eliminados" value={products.length} />
              <StatPill label="Stock" value={totalStock} />
              <StatPill label="Filtrados" value={filteredProducts.length} />
            </div>
          </div>

          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar producto eliminado..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-slate-400 focus:bg-white"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {errorMessage}
          </div>
        )}

        {loading || accessLoading || storeLoading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#061b3a]" />
            Cargando papelera...
          </div>
        ) : products.length === 0 ? (
          <EmptyTrash />
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <h2 className="text-2xl font-black text-[#061b3a]">
              No hay coincidencias
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Prueba buscando por otro nombre, categoría o SKU.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product) => {
              const isLoading = actionLoadingId === product.id;
              const mainImage =
                product.product_images?.find((image) => image.is_main) ||
                product.product_images
                  ?.slice()
                  .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

              return (
                <article
                  key={product.id}
                  className="rounded-3xl bg-white p-4 shadow-sm md:p-5"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-400">
                        {mainImage?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mainImage.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Trash2 size={24} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-black text-slate-900">
                          {product.name}
                        </h2>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            {product.category || "Sin categoría"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            ${Number(product.price || 0).toFixed(2)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">
                            Stock: {product.stock ?? 0}
                          </span>
                        </div>

                        {product.deleted_at && (
                          <p className="mt-2 text-xs font-semibold text-slate-400">
                            Eliminado: {new Date(product.deleted_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:w-[350px]">
                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({ type: "restore", product })
                        }
                        disabled={isLoading || Boolean(actionLoadingId)}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-black text-green-700 disabled:opacity-60"
                      >
                        {isLoading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <RotateCcw size={18} />
                        )}
                        Restaurar
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPendingAction({ type: "delete", product })
                        }
                        disabled={isLoading || Boolean(actionLoadingId)}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                      >
                        {isLoading ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                        Eliminar definitivo
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {pendingAction && (
        <ConfirmActionModal
          pendingAction={pendingAction}
          loading={actionLoadingId === pendingAction.product.id}
          onClose={() => setPendingAction(null)}
          onConfirm={runPendingAction}
        />
      )}
    </main>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
      <p className="text-xl font-black text-[#061b3a]">{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}

function EmptyTrash() {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Trash2 size={28} />
      </div>
      <h2 className="text-2xl font-black text-[#061b3a]">Papelera vacía</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        No hay productos eliminados en esta tienda.
      </p>
    </div>
  );
}

function ConfirmActionModal({
  pendingAction,
  loading,
  onClose,
  onConfirm,
}: {
  pendingAction: Exclude<PendingAction, null>;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isDelete = pendingAction.type === "delete";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                isDelete ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
              }`}
            >
              {isDelete ? <AlertTriangle size={22} /> : <RotateCcw size={22} />}
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                {isDelete ? "¿Eliminar definitivamente?" : "¿Restaurar producto?"}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {isDelete
                  ? "Esta acción eliminará el producto y sus imágenes. No se puede deshacer."
                  : "El producto volverá al listado de productos como activo."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-60"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-5 rounded-2xl bg-slate-50 p-4">
          <p className="font-black text-slate-900">{pendingAction.product.name}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {pendingAction.product.category || "Sin categoría"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-2xl border px-5 py-3 text-center font-black text-slate-700 disabled:opacity-60"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-black text-white disabled:opacity-60 ${
              isDelete ? "bg-red-600" : "bg-green-600"
            }`}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isDelete ? (
              <Trash2 size={18} />
            ) : (
              <RotateCcw size={18} />
            )}
            {isDelete ? "Eliminar" : "Restaurar"}
          </button>
        </div>
      </div>
    </div>
  );
}
