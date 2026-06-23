"use client";

/* =========================================================
   TIENDA - DETALLE DE COMBO

   Página pública para ver:
   - Imagen
   - Nombre
   - Descripción
   - Productos incluidos
   - Precio normal
   - Precio combo
   - Ahorro
========================================================= */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  CheckCircle2,
  Package,
  ShoppingCart,
} from "lucide-react";

import { getComboById } from "@/lib/services/combos";

type ComboItem = {
  id: string;
  quantity: number;
  products?: {
    id: string;
    name: string;
    price: number;
    image_url?: string | null;
  } | null;
};

type ComboDetail = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  combo_items?: ComboItem[];
};

export default function StoreComboDetailPage() {
  const params = useParams();
  const { addComboToCart } = useCart();
  const comboId = params.id as string;

  const [combo, setCombo] = useState<ComboDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCombo = async () => {
      if (!comboId) return;

      setLoading(true);

      const { data, error } = await getComboById(comboId);

      if (error) {
        console.error("Error cargando combo:", error);
        setLoading(false);
        return;
      }

      setCombo(data as ComboDetail);
      setLoading(false);
    };

    loadCombo();
  }, [comboId]);

  const normalPrice =
    combo?.combo_items?.reduce((total, item) => {
      return (
        total +
        Number(item.products?.price || 0) *
          Number(item.quantity || 1)
      );
    }, 0) || 0;

  const comboPrice = Number(combo?.price || 0);
  const savings = Math.max(normalPrice - comboPrice, 0);

  if (loading) {
    return (
      <main className="pb-6">
        <div className="mt-6 rounded-3xl bg-white p-8 text-center text-sm font-semibold text-slate-500 shadow-sm">
          Cargando combo...
        </div>
      </main>
    );
  }

  if (!combo) {
    return (
      <main className="pb-6">
        <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
          <Package size={42} className="mx-auto text-slate-400" />

          <h1 className="mt-4 text-2xl font-black text-[#061b3a]">
            Combo no encontrado
          </h1>

          <Link
            href="/tienda/combos"
            className="mt-5 inline-flex rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white"
          >
            Ver combos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-6">
      <Link
        href="/tienda/combos"
        className="mt-4 inline-flex items-center gap-2 text-sm font-black text-slate-500"
      >
        <ArrowLeft size={18} />
        Volver a combos
      </Link>

      <section className="mt-4 overflow-hidden rounded-3xl bg-white shadow-sm">
        {/* IMAGEN */}
        <div className="relative h-[280px] bg-white md:h-[420px]">
          {combo.image_url ? (
            <Image
              src={combo.image_url}
              alt={combo.name}
              fill
              unoptimized
              className="object-contain p-5"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-50 text-slate-400">
              <Package size={64} />
            </div>
          )}

          {savings > 0 && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-green-600 px-4 py-2 text-sm font-black text-white shadow-lg">
              <BadgePercent size={17} />
              Ahorra ${savings.toFixed(2)}
            </div>
          )}
        </div>

        {/* INFO */}
        <div className="p-5">
          <h1 className="text-3xl font-black text-[#061b3a]">
            {combo.name}
          </h1>

          {combo.description && (
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
              {combo.description}
            </p>
          )}

          {/* PRODUCTOS */}
          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-4">
            <h2 className="text-lg font-black text-[#061b3a]">
              Productos incluidos
            </h2>

            <div className="mt-3 space-y-3">
              {combo.combo_items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2
                      size={20}
                      className="shrink-0 text-green-600"
                    />

                    <div>
                      <p className="text-sm font-black text-[#061b3a]">
                        {item.products?.name || "Producto incluido"}
                      </p>

                      <p className="text-xs font-semibold text-slate-400">
                        Cantidad incluida: x{item.quantity}
                      </p>
                    </div>
                  </div>

                  <span className="text-sm font-black text-slate-500">
                    ${Number(item.products?.price || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* PRECIOS */}
          <div className="mt-5 rounded-3xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">
                Precio normal
              </span>

              <span className="text-sm font-black text-slate-400 line-through">
                ${normalPrice.toFixed(2)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-500">
                Precio combo
              </span>

              <span className="text-3xl font-black text-red-600">
                ${comboPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* BOTÓN */}
<button
  type="button"
  onClick={() =>
    addComboToCart({
      id: combo.id,
      name: combo.name,
      price: combo.price,
      image_url: combo.image_url || "",
    })
  }
  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700"
>
  <ShoppingCart size={20} />
  Agregar combo
</button>
        </div>
      </section>
    </main>
  );
}