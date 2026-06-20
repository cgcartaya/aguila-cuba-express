"use client";

/* =========================================================
   PRODUCT CARD - TIENDA PÚBLICA
   Tarjeta profesional reutilizable para productos
========================================================= */

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Star } from "lucide-react";

import type { Product } from "@/types/cart";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const price = Number(product.price || 0).toFixed(2);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* IMAGEN */}
      <Link href={`/tienda/producto/${product.id}`}>
        <div className="relative h-[150px] w-full bg-white p-3 md:h-[190px]">
          <Image
            src={product.image_url || "/placeholder-product.png"}
            alt={product.name}
            fill
            unoptimized
            className="object-contain p-3 transition duration-300 group-hover:scale-105"
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

        {/* RATING VISUAL */}
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

        {/* PRECIO + CARRITO */}
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-lg font-black text-[#061b3a]">
            ${price}
          </p>

          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm transition hover:bg-red-700"
            aria-label="Agregar al carrito"
          >
            <ShoppingCart size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}