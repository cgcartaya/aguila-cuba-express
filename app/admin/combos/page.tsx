"use client";

/* =========================================================
   ADMIN - COMBOS
   Página principal para gestionar combos de productos

   Próxima refactorización recomendada:
   components/admin/combos/
   ├── ComboCard.tsx
   ├── ComboFormModal.tsx
   ├── ComboProductsList.tsx
   └── ComboEmptyState.tsx
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Package, Pencil, Trash2 } from "lucide-react";

import { getCombos, deleteCombo } from "@/lib/services/combos";

/* =========================================================
   TIPOS
========================================================= */

type ComboProduct = {
  id: string;
  name: string;
  price: number;
};

type ComboItem = {
  id: string;
  quantity: number;
  product_id: string;
  products: ComboProduct;
};

type Combo = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  is_active: boolean;
  combo_items?: ComboItem[];
};

/* =========================================================
   PAGE
========================================================= */

export default function AdminCombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================================================
     CARGAR COMBOS
  ========================================================= */

  const loadCombos = async () => {
    setLoading(true);

    const { data, error } = await getCombos();

    if (error) {
      console.error("Error cargando combos:", error);
      setLoading(false);
      return;
    }

    setCombos((data as Combo[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCombos();
  }, []);

  /* =========================================================
     ELIMINAR COMBO
  ========================================================= */

  const handleDelete = async (comboId: string) => {
    const confirmDelete = confirm(
      "¿Seguro que quieres eliminar este combo?"
    );

    if (!confirmDelete) return;

    const { error } = await deleteCombo(comboId);

    if (error) {
      console.error("Error eliminando combo:", error);
      alert("No se pudo eliminar el combo.");
      return;
    }

    await loadCombos();
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a]">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black">
              Combos
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Crea paquetes de productos que descuentan inventario real.
            </p>
          </div>

          <Link
            href="/admin/combos/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700"
          >
            <Plus size={18} />
            Nuevo combo
          </Link>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
            Cargando combos...
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && combos.length === 0 && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Package size={32} />
            </div>

            <h2 className="text-xl font-black">
              No hay combos todavía
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
              Crea combos seleccionando productos existentes. Cuando se venda un combo,
              luego descontaremos automáticamente el inventario de cada producto incluido.
            </p>

            <Link
              href="/admin/combos/new"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
            >
              <Plus size={18} />
              Crear primer combo
            </Link>
          </div>
        )}

        {/* GRID DE COMBOS */}
        {!loading && combos.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {combos.map((combo) => {
              const normalPrice =
                combo.combo_items?.reduce((total, item) => {
                  return (
                    total +
                    Number(item.products?.price || 0) *
                      Number(item.quantity || 1)
                  );
                }, 0) || 0;

              const savings = normalPrice - Number(combo.price || 0);

              return (
                <article
                  key={combo.id}
                  className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  {/* IMAGEN */}
                  <div className="flex h-40 items-center justify-center bg-slate-100">
                    {combo.image_url ? (
                      <img
                        src={combo.image_url}
                        alt={combo.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package size={48} className="text-slate-400" />
                    )}
                  </div>

                  {/* CONTENIDO */}
                  <div className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-black">
                          {combo.name}
                        </h2>

                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">
                          {combo.description || "Sin descripción"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          combo.is_active
                            ? "bg-green-50 text-green-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {combo.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* PRECIOS */}
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-500">
                          Precio normal
                        </span>
                        <span className="font-black line-through text-slate-400">
                          ${normalPrice.toFixed(2)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-500">
                          Precio combo
                        </span>
                        <span className="text-xl font-black text-red-600">
                          ${Number(combo.price || 0).toFixed(2)}
                        </span>
                      </div>

                      {savings > 0 && (
                        <p className="mt-2 text-xs font-black text-green-600">
                          Ahorro: ${savings.toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* PRODUCTOS INCLUIDOS */}
                    <div className="mt-4">
                      <h3 className="mb-2 text-sm font-black">
                        Productos incluidos
                      </h3>

                      <div className="space-y-2">
                        {combo.combo_items?.length ? (
                          combo.combo_items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                            >
                              <span className="font-semibold">
                                {item.products?.name || "Producto eliminado"}
                              </span>

                              <span className="font-black text-slate-500">
                                x{item.quantity}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm font-semibold text-slate-400">
                            Sin productos agregados.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ACCIONES */}
                    <div className="mt-5 flex gap-2">
                      <Link
                        href={`/admin/combos/${combo.id}/edit`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-4 py-3 text-sm font-black text-white"
                      >
                        <Pencil size={16} />
                        Editar
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(combo.id)}
                        className="flex items-center justify-center rounded-2xl bg-red-50 px-4 py-3 text-red-600 transition hover:bg-red-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}