"use client";

/* =========================================================
   PRODUCTS CAROUSEL - TIENDA PÚBLICA

   Productos destacados en una sola fila deslizable.

   Incluye:
   - Estado agotado por stock
   - Botón deshabilitado si no hay stock
========================================================= */

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Star } from "lucide-react";

import type { Product } from "@/types/cart";

type Props = {
  productos: Product[];
  agregarAlCarrito: (producto: Product) => void;
};

export default function ProductsCarousel({
  productos,
  agregarAlCarrito,
}: Props) {
  if (productos.length === 0) {
    return (
      <div className="py-8 text-center text-sm font-semibold text-slate-500">
        No se encontraron productos.
      </div>
    );
  }

  return (
    <section className="mt-8">
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#061b3a]">
          Productos destacados
        </h2>

        <Link
          href="/tienda/productos-destacados"
          className="text-sm font-black text-[#061b3a]"
        >
          Ver todos ?
        </Link>
      </div>

      {/* CARRUSEL HORIZONTAL */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {productos.map((producto) => {
          const outOfStock = Number(producto.stock || 0) <= 0;

          return (
            <article
              key={producto.id}
              className="group relative min-w-[165px] max-w-[165px] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:min-w-[185px] sm:max-w-[185px]"
            >
              {/* FAVORITO VISUAL */}
              <button
                type="button"
                className="absolute right-3 top-3 z-10 text-[#061b3a]"
                aria-label="Favorito"
              >
                <Heart size={20} />
              </button>

              {/* IMAGEN */}
              <Link href={`/tienda/producto/${producto.id}`}>
                <div className="relative h-[135px] w-full bg-white p-3">
                  {outOfStock && (
                    <div className="absolute left-2 top-2 z-20 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black text-white shadow">
                      AGOTADO
                    </div>
                  )}

                  <Image
                    src={
                      producto.image_url ||
                      "/placeholder-product.png"
                    }
                    alt={producto.name}
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
                <Link href={`/tienda/producto/${producto.id}`}>
                  <h3 className="line-clamp-2 min-h-[38px] text-sm font-black leading-tight text-[#061b3a]">
                    {producto.name}
                  </h3>
                </Link>

                {/* RATING */}
                <div className="mt-2 flex items-center gap-[2px]">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Star
                      key={item}
                      size={12}
                      className="fill-yellow-400 text-yellow-400"
                    />
                  ))}

                  <span className="ml-1 text-xs font-semibold text-slate-400">
                    (24)
                  </span>
                </div>

                {/* PRECIO + BOTÓN */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-lg font-black text-[#061b3a]">
                    ${Number(producto.price || 0).toFixed(2)}
                  </p>

                  <button
                    type="button"
                    disabled={outOfStock}
                    onClick={() => agregarAlCarrito(producto)}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition ${
                      outOfStock
                        ? "cursor-not-allowed bg-slate-300"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                    aria-label={
                      outOfStock
                        ? "Producto agotado"
                        : "Agregar al carrito"
                    }
                  >
                    <ShoppingCart size={18} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}