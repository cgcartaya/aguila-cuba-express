"use client";

/* =========================================================
   TIENDA PÚBLICA - DETALLE DE COMBO

   Corrección:
   - Supabase puede devolver combo_items.products como objeto o array.
   - Se normaliza antes de guardar en estado.
   - Evita el error de build en Vercel:
     app/tienda/combos/[id]/page.tsx
========================================================= */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, ShoppingCart } from "lucide-react";

import { getComboById } from "@/lib/services/combos";

type ComboProduct = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  stock?: number | null;
  category?: string | null;
  is_active?: boolean | null;
  store_id?: string | null;
};

type ComboProductRelation = ComboProduct | ComboProduct[] | null;

type ComboItemFromDB = {
  id: string;
  quantity: number | null;
  product_id: string;
  products: ComboProductRelation;
};

type ComboFromDB = {
  id: string;
  store_id?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number | string | null;
  is_active: boolean | null;
  created_at?: string | null;
  combo_items?: ComboItemFromDB[] | null;
};

type ComboItem = {
  id: string;
  quantity: number;
  product_id: string;
  products: ComboProduct;
};

type ComboDetail = {
  id: string;
  store_id?: string | null;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  is_active: boolean;
  created_at?: string | null;
  combo_items: ComboItem[];
};

function normalizeComboProduct(
  productRelation: ComboProductRelation
): ComboProduct | null {
  if (Array.isArray(productRelation)) {
    return productRelation[0] ?? null;
  }

  return productRelation ?? null;
}

function normalizeCombo(combo: ComboFromDB): ComboDetail {
  const comboItems = (combo.combo_items || []).reduce<ComboItem[]>(
    (acc, item) => {
      const product = normalizeComboProduct(item.products);

      if (!product) {
        return acc;
      }

      acc.push({
        id: item.id,
        quantity: Number(item.quantity || 1),
        product_id: item.product_id,
        products: {
          ...product,
          price: Number(product.price || 0),
        },
      });

      return acc;
    },
    []
  );

  return {
    id: combo.id,
    store_id: combo.store_id,
    name: combo.name,
    description: combo.description,
    image_url: combo.image_url,
    price: Number(combo.price || 0),
    is_active: Boolean(combo.is_active),
    created_at: combo.created_at,
    combo_items: comboItems,
  };
}

export default function ComboDetailPage() {
  const params = useParams();
  const comboId = params.id as string;

  const [combo, setCombo] = useState<ComboDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCombo = async () => {
      if (!comboId) return;

      setLoading(true);

      const { data, error } = await getComboById(comboId);

      if (error || !data) {
        console.error("Error cargando combo:", error);
        setCombo(null);
        setLoading(false);
        return;
      }

      setCombo(normalizeCombo(data as unknown as ComboFromDB));
      setLoading(false);
    };

    loadCombo();
  }, [comboId]);

  const regularPrice =
    combo?.combo_items.reduce((total, item) => {
      return (
        total +
        Number(item.products.price || 0) * Number(item.quantity || 1)
      );
    }, 0) || 0;

  const comboPrice = Number(combo?.price || 0);
  const savings = regularPrice - comboPrice;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a]">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Cargando combo...
        </div>
      </main>
    );
  }

  if (!combo) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a]">
        <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black">Combo no encontrado</h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            No pudimos cargar la información de este combo.
          </p>

          <Link
            href="/tienda"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white"
          >
            <ArrowLeft size={18} />
            Volver a la tienda
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/tienda"
          className="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500 transition hover:text-[#061b3a]"
        >
          <ArrowLeft size={18} />
          Volver a la tienda
        </Link>

        <section className="grid gap-6 rounded-3xl bg-white p-4 shadow-sm md:grid-cols-2 md:p-6">
          <div className="flex min-h-[300px] items-center justify-center overflow-hidden rounded-3xl bg-slate-100">
            {combo.image_url ? (
              <img
                src={combo.image_url}
                alt={combo.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <Package size={64} className="text-slate-400" />
            )}
          </div>

          <div className="flex flex-col justify-center">
            <span className="mb-3 inline-flex w-fit rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">
              Combo especial
            </span>

            <h1 className="text-3xl font-black md:text-4xl">
              {combo.name}
            </h1>

            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              {combo.description || "Combo de productos seleccionados."}
            </p>

            <div className="mt-5 rounded-3xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">
                  Precio normal
                </span>

                <span className="text-sm font-black text-slate-400 line-through">
                  ${regularPrice.toFixed(2)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">
                  Precio combo
                </span>

                <span className="text-3xl font-black text-red-600">
                  ${comboPrice.toFixed(2)}
                </span>
              </div>

              {savings > 0 && (
                <p className="mt-2 text-sm font-black text-green-600">
                  Ahorras ${savings.toFixed(2)}
                </p>
              )}
            </div>

            <button
              type="button"
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700"
            >
              <ShoppingCart size={18} />
              Agregar combo al carrito
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-4 shadow-sm md:p-6">
          <h2 className="text-xl font-black">Productos incluidos</h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {combo.combo_items.map((item) => (
              <article
                key={item.id}
                className="flex gap-3 rounded-2xl bg-slate-50 p-3"
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white">
                  {item.products.image_url ? (
                    <img
                      src={item.products.image_url}
                      alt={item.products.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package size={24} className="text-slate-400" />
                  )}
                </div>

                <div>
                  <h3 className="line-clamp-1 text-sm font-black">
                    {item.products.name}
                  </h3>

                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Cantidad: {item.quantity}
                  </p>

                  <p className="mt-1 text-sm font-black text-red-600">
                    ${Number(item.products.price || 0).toFixed(2)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
