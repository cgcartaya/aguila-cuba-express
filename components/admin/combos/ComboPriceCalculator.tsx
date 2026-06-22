"use client";

/* =========================================================
   COMBO PRICE CALCULATOR - COMBOS ADMIN

   Calcula en tiempo real:
   - Precio normal de los productos individuales
   - Precio final del combo
   - Ahorro o diferencia
========================================================= */

import { BadgeDollarSign, TrendingDown, TrendingUp } from "lucide-react";

import type { ComboFormData, SelectedComboProduct } from "./types";

type ComboPriceCalculatorProps = {
  formData: ComboFormData;
  setFormData: React.Dispatch<React.SetStateAction<ComboFormData>>;
  selectedProducts: SelectedComboProduct[];
};

export default function ComboPriceCalculator({
  formData,
  setFormData,
  selectedProducts,
}: ComboPriceCalculatorProps) {
  /* =========================================================
     PRECIO NORMAL
     Suma el precio de cada producto multiplicado por cantidad
  ========================================================= */

  const regularPrice = selectedProducts.reduce((total, item) => {
    return total + Number(item.product.price || 0) * item.quantity;
  }, 0);

  /* =========================================================
     PRECIO DEL COMBO
  ========================================================= */

  const comboPrice = Number(formData.price || 0);

  /* =========================================================
     DIFERENCIA
     Positiva = ahorro
     Negativa = el combo cuesta más que separado
  ========================================================= */

  const difference = regularPrice - comboPrice;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-50 text-green-600">
          <BadgeDollarSign size={24} />
        </div>

        <div>
          <h2 className="text-lg font-black text-[#061b3a]">
            Precio del combo
          </h2>

          <p className="text-sm font-semibold text-slate-500">
            Define el precio final que verá el cliente.
          </p>
        </div>
      </div>

      {/* PRECIO NORMAL */}
      <div className="rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-slate-500">
            Precio normal
          </span>

          <span className="font-black text-slate-400 line-through">
            ${regularPrice.toFixed(2)}
          </span>
        </div>

        {/* PRECIO FINAL */}
        <label className="mt-4 block">
          <span className="text-sm font-black text-[#061b3a]">
            Precio final del combo
          </span>

          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.price}
            onChange={(e) =>
              setFormData((current) => ({
                ...current,
                price: Number(e.target.value),
              }))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-lg font-black text-[#061b3a] outline-none focus:border-red-600"
            placeholder="0.00"
          />
        </label>

        {/* AHORRO / DIFERENCIA */}
        <div className="mt-4">
          {selectedProducts.length === 0 ? (
            <p className="text-sm font-semibold text-slate-400">
              Agrega productos para calcular el precio normal.
            </p>
          ) : difference > 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-black text-green-600">
              <TrendingDown size={18} />
              El cliente ahorra ${difference.toFixed(2)}
            </div>
          ) : difference < 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-black text-orange-600">
              <TrendingUp size={18} />
              El combo cuesta ${Math.abs(difference).toFixed(2)} más que separado
            </div>
          ) : (
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-500">
              Sin descuento aplicado.
            </div>
          )}
        </div>

        {/* BOTÓN RÁPIDO */}
        {selectedProducts.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setFormData((current) => ({
                ...current,
                price: Number(regularPrice.toFixed(2)),
              }))
            }
            className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-[#061b3a] transition hover:bg-slate-50"
          >
            Usar precio normal
          </button>
        )}
      </div>
    </section>
  );
}