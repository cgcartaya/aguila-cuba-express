"use client";

/* =========================================================
   PRODUCT CARD V2 - INSTACART / WALMART STYLE

   Características:

   - Imagen
   - Nombre
   - Rating visual
   - Precio
   - Botón Agregar
   - Controles [-] cantidad [+]
   - Validación de stock
   - Integración completa con CartContext
========================================================= */

import Image from "next/image";
import Link from "next/link";

import {
  Minus,
  Plus,
  Star,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";

import type { Product } from "@/types/cart";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const {
    getItemQuantity,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const price = Number(product.price || 0).toFixed(2);

  const outOfStock =
    Number(product.stock || 0) <= 0;

  // ======================================================
  // CANTIDAD ACTUAL EN CARRITO
  // ======================================================

  const quantity = getItemQuantity(
    Number(product.id)
  );

  const cartItemId = `product-${product.id}`;

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* IMAGEN */}
      <Link href={`/tienda/producto/${product.id}`}>
        <div className="relative h-[150px] w-full bg-white p-3 md:h-[190px]">
          {outOfStock && (
            <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white shadow">
              AGOTADO
            </div>
          )}

          <Image
            src={
              product.image_url ||
              "/placeholder-product.png"
            }
            alt={product.name}
            fill
            unoptimized
            className={`object-contain p-3 transition duration-300 ${
              outOfStock
                ? "opacity-50 grayscale"
                : "group-hover:scale-105"
            }`}
          />
        </div>
      </Link>

      {/* CONTENIDO */}
      <div className="p-3 pt-1">
        <Link href={`/tienda/producto/${product.id}`}>
          <h3 className="line-clamp-2 min-h-[42px] text-sm font-black leading-tight text-[#061b3a] md:text-base">
            {product.name}
          </h3>
        </Link>

        {/* RATING */}
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((item) => (
            <Star
              key={item}
              size={13}
              className="fill-yellow-400 text-yellow-400"
            />
          ))}

          <span className="ml-1 text-xs font-semibold text-slate-400">
            (24)
          </span>
        </div>

        {/* PRECIO + CONTROLES */}
        <div className="mt-3">
          <p className="text-lg font-black text-[#061b3a]">
            ${price}
          </p>

          {/* PRODUCTO AGOTADO */}
          {outOfStock ? (
            <button
              disabled
              className="
                mt-3 w-full rounded-xl
                bg-slate-300 py-3
                font-black text-white
              "
            >
              Agotado
            </button>
          ) : quantity === 0 ? (
            /* BOTÓN AGREGAR */
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="
                mt-3 w-full rounded-xl
                bg-red-600 py-3
                font-black text-white
                transition hover:bg-red-700
              "
            >
              Agregar
            </button>
          ) : (
            /* CONTROLES INSTACART */
            <div
              className="
                mt-3 flex items-center
                justify-between rounded-xl
                border border-slate-200
                bg-slate-50 p-1
              "
            >
              <button
                onClick={() =>
                  decreaseQuantity(cartItemId)
                }
                className="
                  flex h-10 w-10 items-center
                  justify-center rounded-lg
                  bg-white shadow-sm
                "
              >
                <Minus size={18} />
              </button>

              <span className="text-lg font-black">
                {quantity}
              </span>

              <button
                onClick={() =>
                  increaseQuantity(cartItemId)
                }
                disabled={
                  quantity >=
                  Number(product.stock)
                }
                className="
                  flex h-10 w-10 items-center
                  justify-center rounded-lg
                  bg-red-600 text-white
                  shadow-sm transition
                  hover:bg-red-700
                  disabled:bg-slate-300
                "
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}