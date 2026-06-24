"use client";

/* =========================================================
   STORE COMBO CARD - TIENDA PÚBLICA

   Versión horizontal compacta.

   Objetivo:
   - Todas las cards con la misma altura.
   - Mejor uso del ancho.
   - Imagen y contenido alineados.
   - Botón siempre abajo.
========================================================= */

import Image from "next/image";
import Link from "next/link";
import { BadgePercent, CheckCircle2, Package } from "lucide-react";

import { useCart } from "@/contexts/CartContext";

type ComboItem = {
  id: string;
  quantity: number;
  products?: {
    id: string;
    name: string;
    price: number;
  } | null;
};

export type StoreCombo = {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price: number;
  combo_items?: ComboItem[];
};

type Props = {
  combo: StoreCombo;
};

export default function StoreComboCard({ combo }: Props) {
  const { addComboToCart } = useCart();

  const normalPrice =
    combo.combo_items?.reduce((total, item) => {
      return (
        total +
        Number(item.products?.price || 0) * Number(item.quantity || 1)
      );
    }, 0) || 0;

  const comboPrice = Number(combo.price || 0);
  const savings = Math.max(normalPrice - comboPrice, 0);

  const visibleItems = combo.combo_items?.slice(0, 2) || [];
  const hiddenItemsCount =
    (combo.combo_items?.length || 0) - visibleItems.length;

  return (
    <article className="group flex min-w-[320px] max-w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:min-w-[360px] sm:max-w-[360px]">
      <div className="flex min-h-[190px] gap-3">
        {/* IMAGEN */}
        <Link
          href={`/tienda/combos/${combo.id}`}
          className="relative h-[150px] w-[45%] shrink-0 overflow-hidden rounded-xl bg-white"
        >
          {savings > 0 && (
            <div className="absolute left-1 top-1 z-10 flex items-center gap-1 rounded-full bg-green-600 px-2 py-1 text-[10px] font-black text-white shadow">
              <BadgePercent size={11} />
              Ahorra ${savings.toFixed(0)}
            </div>
          )}

          {combo.image_url ? (
            <Image
              src={combo.image_url}
              alt={combo.name}
              fill
              unoptimized
              className="object-contain p-2 transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Package size={34} />
            </div>
          )}
        </Link>

        {/* CONTENIDO */}
        <div className="flex flex-1 flex-col">
          <Link href={`/tienda/combos/${combo.id}`}>
            <h3 className="line-clamp-2 min-h-[40px] text-sm font-black leading-tight text-[#061b3a]">
              {combo.name}
            </h3>
          </Link>

          <div className="mt-2">
            <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
              Incluye
            </p>

            <div className="space-y-1">
              {visibleItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-1 text-[11px] font-semibold text-slate-600"
                >
                  <CheckCircle2
                    size={12}
                    className="mt-[1px] shrink-0 text-green-600"
                  />

                  <span className="line-clamp-1">
                    {item.products?.name || "Producto incluido"}
                    {item.quantity > 1 && (
                      <strong className="text-[#061b3a]">
                        {" "}
                        x{item.quantity}
                      </strong>
                    )}
                  </span>
                </div>
              ))}

              {hiddenItemsCount > 0 && (
                <p className="text-[10px] font-bold text-slate-400">
                  +{hiddenItemsCount} productos más
                </p>
              )}
            </div>
          </div>

          <div className="mt-auto pt-2">
            {normalPrice > 0 && normalPrice > comboPrice && (
              <p className="text-xs font-semibold text-slate-400 line-through">
                ${normalPrice.toFixed(2)}
              </p>
            )}

            <p className="text-xl font-black text-[#061b3a]">
              ${comboPrice.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* BOTÓN SIEMPRE ABAJO */}
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
        className="mt-3 w-full rounded-xl bg-red-600 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
      >
        Agregar combo
      </button>
    </article>
  );
}