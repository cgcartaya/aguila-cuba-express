"use client";

/* =========================================================
   CATEGORY SHOWCASE CARD

   Correcciones:
   - Mejor ancho mobile.
   - Evita que el carrusel rompa la pantalla en iPhone.
   - Mantiene colores dinámicos desde Supabase.
========================================================= */

import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { Product } from "@/types/cart";

type Props = {
  category: string;
  color?: string | null;
  products: Product[];
};

export default function CategoryShowcaseCard({
  category,
  color,
  products,
}: Props) {
  const previewProducts = products.slice(0, 4);

  const categorySlug = encodeURIComponent(category.toLowerCase());

  return (
    <Link
      href={`/tienda/categorias/${categorySlug}`}
     className="w-[calc(100vw-2rem)] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
    >
      <div
        className="mb-2 flex items-center justify-between rounded-xl px-4 py-3 text-white"
        style={{
          backgroundColor: color || "#3b82f6",
        }}
      >
        <h3 className="line-clamp-1 text-lg font-black">
          {category}
        </h3>

        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
          <ChevronRight size={22} />
        </div>
      </div>

      <div
        className="grid grid-cols-2 gap-3 rounded-xl p-3"
        style={{
          backgroundColor: `${color || "#f8fafc"}15`,
        }}
      >
        {previewProducts.map((product) => (
          <div
            key={product.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
          >
            <div className="relative h-24 w-full rounded-lg bg-white">
              <Image
                src={product.image_url || "/placeholder-product.png"}
                alt={product.name}
                fill
                unoptimized
                className="object-contain"
              />
            </div>

            <p className="mt-3 line-clamp-2 min-h-[42px] text-sm font-bold text-[#061b3a]">
              {product.name}
            </p>

            <p
              className="mt-1 text-sm font-black"
              style={{
                color: color || "#2563eb",
              }}
            >
              Ahorra más
            </p>
          </div>
        ))}

        {previewProducts.length === 0 && (
          <div className="col-span-2 rounded-xl bg-white p-8 text-center text-sm text-gray-500">
            Próximamente productos en esta categoría.
          </div>
        )}
      </div>
    </Link>
  );
}