"use client";

/* =========================================================
   STORE COMBO CARD - VERSIÓN PROFESIONAL

   Utilizada en:
   - Home de tienda
   - Página /tienda/combos

   Diseño:
   - Mobile first
   - Desktop optimizado
   - Badge de ahorro
   - Imagen más grande
========================================================= */

import Image from "next/image";
import { Package, ShoppingCart, BadgePercent } from "lucide-react";

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
  const normalPrice =
    combo.combo_items?.reduce((total, item) => {
      return (
        total +
        Number(item.products?.price || 0) *
          Number(item.quantity || 1)
      );
    }, 0) || 0;

  const comboPrice = Number(combo.price || 0);

  const savings = Math.max(
    normalPrice - comboPrice,
    0
  );

  const totalProducts =
    combo.combo_items?.reduce((total, item) => {
      return total + Number(item.quantity || 0);
    }, 0) || 0;

  return (
    <article
      className="
        group
        overflow-hidden
        rounded-3xl
        border
        border-slate-200
        bg-white
        shadow-sm
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-xl
      "
    >
      {/* IMAGEN */}
      <div className="relative h-[180px] bg-white md:h-[220px]">
        {combo.image_url ? (
          <Image
            src={combo.image_url}
            alt={combo.name}
            fill
            unoptimized
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-slate-50 text-slate-400">
            <Package size={50} />
          </div>
        )}

        {savings > 0 && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-green-600 px-3 py-1 text-xs font-black text-white shadow-lg">
            <BadgePercent size={14} />
            Ahorra ${savings.toFixed(0)}
          </div>
        )}
      </div>

      {/* CONTENIDO */}
      <div className="p-4">
        <h3 className="line-clamp-2 text-lg font-black text-[#061b3a]">
          {combo.name}
        </h3>

        <p className="mt-1 line-clamp-2 min-h-[40px] text-sm font-semibold text-slate-500">
          {combo.description || "Combo preparado para tu familia."}
        </p>

        {/* PRODUCTOS */}
        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2">
          <span className="text-xs font-black text-slate-600">
            {totalProducts} productos incluidos
          </span>
        </div>

        {/* PRECIOS */}
        <div className="mt-4">
          {normalPrice > 0 && (
            <p className="text-sm font-bold text-slate-400 line-through">
              ${normalPrice.toFixed(2)}
            </p>
          )}

          <div className="flex items-end gap-2">
            <span className="text-3xl font-black text-red-600">
              ${comboPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* BOTÓN */}
        <button
          type="button"
          className="
            mt-4
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-2xl
            bg-red-600
            px-4
            py-3
            text-sm
            font-black
            text-white
            transition
            hover:bg-red-700
          "
        >
          <ShoppingCart size={18} />
          Agregar combo
        </button>
      </div>
    </article>
  );
}