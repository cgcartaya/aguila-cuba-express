"use client";

/* =========================================================
   COMBO CARD - ADMIN

   Card compacta para listar combos en admin.

   Objetivo:
   - Verse bien en móvil
   - Permitir 2 columnas
   - No mostrar toda la lista de productos
   - Mostrar solo resumen rápido
========================================================= */

import Link from "next/link";
import { Package, Pencil, Trash2 } from "lucide-react";

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

type ComboCardProps = {
  combo: Combo;
  onDelete: (comboId: string) => void;
};

export default function ComboCard({ combo, onDelete }: ComboCardProps) {
  /* =========================================================
     PRECIO NORMAL DEL COMBO

     Suma:
     precio del producto x cantidad incluida
  ========================================================= */

  const normalPrice =
    combo.combo_items?.reduce((total, item) => {
      return (
        total +
        Number(item.products?.price || 0) * Number(item.quantity || 1)
      );
    }, 0) || 0;

  const comboPrice = Number(combo.price || 0);
  const savings = normalPrice - comboPrice;

  const totalItems =
    combo.combo_items?.reduce((total, item) => {
      return total + Number(item.quantity || 0);
    }, 0) || 0;

  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      {/* IMAGEN */}
      <div className="relative flex h-32 items-center justify-center bg-slate-100 sm:h-40">
        {combo.image_url ? (
          <img
            src={combo.image_url}
            alt={combo.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package size={38} className="text-slate-400" />
        )}

        <span
          className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[11px] font-black ${
            combo.is_active
              ? "bg-green-50 text-green-600"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {combo.is_active ? "Activo" : "Off"}
        </span>
      </div>

      {/* CONTENIDO */}
      <div className="p-3 sm:p-4">
        <h2 className="line-clamp-1 text-sm font-black text-[#061b3a] sm:text-base">
          {combo.name}
        </h2>

        <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">
          {combo.description || "Sin descripción"}
        </p>

        {/* PRECIO */}
        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500">
              Normal
            </span>

            <span className="text-xs font-black text-slate-400 line-through">
              ${normalPrice.toFixed(2)}
            </span>
          </div>

          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500">
              Combo
            </span>

            <span className="text-base font-black text-red-600">
              ${comboPrice.toFixed(2)}
            </span>
          </div>

          {savings > 0 && (
            <p className="mt-1 text-[11px] font-black text-green-600">
              Ahorra ${savings.toFixed(2)}
            </p>
          )}
        </div>

        {/* RESUMEN */}
        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
          {totalItems} productos incluidos
        </div>

        {/* ACCIONES */}
        <div className="mt-3 flex gap-2">
          <Link
            href={`/admin/combos/${combo.id}/edit`}
            className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-[#061b3a] px-3 py-2.5 text-xs font-black text-white"
          >
            <Pencil size={14} />
            Editar
          </Link>

          <button
            type="button"
            onClick={() => onDelete(combo.id)}
            className="flex items-center justify-center rounded-2xl bg-red-50 px-3 py-2.5 text-red-600 transition hover:bg-red-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}