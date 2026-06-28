"use client";

/* =========================================================
   IMPORTS
========================================================= */

import { useState } from "react";
import { ShoppingCart, ShieldCheck, Truck } from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

type ProductInfoProps = {
  name: string;
  price: number;
  description?: string | null;
  tag?: string | null;
  stock: number;
  quantity: number;
  setQuantity: (value: number | ((prev: number) => number)) => void;
  onAddToCart: () => void;
};

/* =========================================================
   PRODUCT INFO
========================================================= */

export default function ProductInfo({
  name,
  price,
  description,
  tag,
  stock,
  quantity,
  setQuantity,
  onAddToCart,
}: ProductInfoProps) {
  const hasStock = Number(stock) > 0;

  const [expanded, setExpanded] = useState(false);

  return (
    <section>
      {/* TAG */}
      {tag && (
        <span className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-600">
          {tag}
        </span>
      )}

      {/* NOMBRE */}
      <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
        {name}
      </h1>

      {/* PRECIO */}
      <p className="mt-4 text-3xl font-black text-red-600">
        ${Number(price).toFixed(2)}
      </p>

      {/* STOCK */}
      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        {hasStock ? (
          <>
            <p className="text-sm font-black text-green-600">
              ?? En stock
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Quedan {stock} unidades disponibles.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-black text-red-600">
              ?? Agotado
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Producto no disponible actualmente.
            </p>
          </>
        )}
      </div>

      {/* BENEFICIOS COMPACTOS */}
      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-1">
          <Truck size={16} className="text-red-500" />
          Entrega en Cuba
        </div>

        <div className="flex items-center gap-1">
          <ShieldCheck size={16} className="text-green-600" />
          Compra segura
        </div>
      </div>

      {/* DESCRIPCIÓN */}
      {description && (
        <div className="mt-5">
          <h3 className="mb-2 font-black">
            Descripción
          </h3>

          <p
            className={`leading-relaxed text-slate-600 ${
              !expanded ? "line-clamp-4" : ""
            }`}
          >
            {description}
          </p>

          {description.length > 180 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-2 font-bold text-blue-700"
            >
              {expanded ? "Ver menos" : "Ver más"}
            </button>
          )}
        </div>
      )}

      {/* CANTIDAD */}
      {hasStock && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-black">
            Cantidad
          </p>

          <div className="flex w-fit items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() =>
                setQuantity((prev) => Math.max(1, prev - 1))
              }
              className="px-5 py-3 text-xl font-black hover:bg-slate-100"
            >
              -
            </button>

            <span className="min-w-12 text-center font-black">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() =>
                setQuantity((prev) =>
                  Math.min(Number(stock), prev + 1)
                )
              }
              className="px-5 py-3 text-xl font-black hover:bg-slate-100"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* BOTÓN */}
      <button
        type="button"
        disabled={!hasStock}
        onClick={onAddToCart}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-4 text-base font-black text-white transition hover:bg-[#0b2d61] disabled:bg-slate-300"
      >
        <ShoppingCart size={20} />

        {hasStock
          ? `Agregar ${quantity} al carrito`
          : "Producto agotado"}
      </button>
    </section>
  );
}