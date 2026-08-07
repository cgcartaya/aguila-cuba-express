"use client";

import { Plus, Trash2 } from "lucide-react";

import {
  createPriceTierDraft,
  type ProductPriceTierDraft,
} from "@/lib/services/product-pricing";

type Props = {
  basePrice: string;
  maxQuantityPerOrder: string;
  onMaxQuantityChange: (value: string) => void;
  tiers: ProductPriceTierDraft[];
  onTiersChange: (tiers: ProductPriceTierDraft[]) => void;
};

export default function ProductPurchaseRulesEditor({
  basePrice,
  maxQuantityPerOrder,
  onMaxQuantityChange,
  tiers,
  onTiersChange,
}: Props) {
  const updateTier = (
    key: string,
    field: "min_quantity" | "unit_price",
    value: string
  ) => {
    onTiersChange(
      tiers.map((tier) =>
        tier.key === key
          ? {
              ...tier,
              [field]: value,
            }
          : tier
      )
    );
  };

  const removeTier = (key: string) => {
    onTiersChange(tiers.filter((tier) => tier.key !== key));
  };

  return (
    <section className="md:col-span-2 rounded-3xl border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-lg font-black text-slate-900">
          Reglas de compra
        </h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Configura límites por pedido y descuentos automáticos según
          la cantidad comprada.
        </p>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-black text-slate-700">
          Máximo de unidades por orden
        </label>

        <input
          type="number"
          min="1"
          step="1"
          value={maxQuantityPerOrder}
          onChange={(event) =>
            onMaxQuantityChange(event.target.value)
          }
          placeholder="Sin límite"
          className="w-full rounded-2xl border px-4 py-3 outline-none focus:border-black md:max-w-xs"
        />

        <p className="mt-2 text-xs font-semibold text-slate-500">
          Déjalo vacío para permitir cualquier cantidad disponible en
          stock. Ejemplo: escribe 2 para limitar aceite a 2 unidades
          por pedido.
        </p>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-slate-900">
              Precio por cantidad
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              El sistema usará automáticamente la escala más alta que
              alcance el cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onTiersChange([
                ...tiers,
                createPriceTierDraft(),
              ])
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            <Plus size={16} />
            Agregar escala
          </button>
        </div>

        {tiers.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
            Sin descuentos por cantidad. El producto siempre usará su
            precio normal de{" "}
            <strong>
              {Number(basePrice || 0).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </strong>
            .
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {tiers.map((tier) => (
              <div
                key={tier.key}
                className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_auto]"
              >
                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Desde cuántas unidades
                  </span>
                  <input
                    type="number"
                    min="2"
                    step="1"
                    value={tier.min_quantity}
                    onChange={(event) =>
                      updateTier(
                        tier.key,
                        "min_quantity",
                        event.target.value
                      )
                    }
                    placeholder="Ej: 2"
                    className="w-full rounded-xl border bg-white px-3 py-2.5 font-bold outline-none focus:border-black"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-500">
                    Precio por unidad
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tier.unit_price}
                    onChange={(event) =>
                      updateTier(
                        tier.key,
                        "unit_price",
                        event.target.value
                      )
                    }
                    placeholder="Ej: 22.00"
                    className="w-full rounded-xl border bg-white px-3 py-2.5 font-bold outline-none focus:border-black"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeTier(tier.key)}
                  className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl border border-red-200 bg-white px-3 text-sm font-black text-red-600 hover:bg-red-50"
                  aria-label="Eliminar escala"
                >
                  <Trash2 size={17} />
                  <span className="md:hidden">Eliminar</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-xs font-semibold leading-5 text-blue-800">
          Ejemplo: precio normal $24, desde 2 unidades $22 y desde 4
          unidades $20. Una compra de 5 unidades usará $20 por cada
          unidad.
        </div>
      </div>
    </section>
  );
}
