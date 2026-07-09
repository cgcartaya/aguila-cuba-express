"use client";

/* =========================================================
   CATEGORY SHOWCASE CARD

   Fix multiempresa:
   - El link de la tarjeta conserva el slug de la tienda actual.
   - Usa <img> normal para imágenes de productos de Supabase.
========================================================= */

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import type { Product } from "@/types/cart";

type Props = {
  category: string;
  color?: string | null;
  products: Product[];
  storeSlug?: string;
};

function getSafeImageUrl(url?: string | null) {
  return url?.trim() || "/placeholder-product.png";
}

export default function CategoryShowcaseCard({
  category,
  color,
  products,
  storeSlug,
}: Props) {
  const previewProducts = products.slice(0, 4);
  const categorySlug = encodeURIComponent(category.toLowerCase());
  const isDefaultStore = !storeSlug || storeSlug === "aguila";
  const categoryUrl = isDefaultStore
    ? `/tienda/categorias/${categorySlug}`
    : `/tienda/${storeSlug}/categorias/${categorySlug}`;

  return (
    <Link
      href={categoryUrl}
      className="w-[85%] min-w-[280px] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:w-[420px]"
    >
      <div
        className="mb-2 flex items-center justify-between rounded-xl px-4 py-3 text-white"
        style={{
          backgroundColor: color || "#3b82f6",
        }}
      >
        <h3 className="line-clamp-1 text-lg font-black">{category}</h3>

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
        {previewProducts.map((product) => {
          const imageUrl = getSafeImageUrl(product.image_url);

          return (
            <div
              key={product.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="h-24 w-full overflow-hidden rounded-lg bg-white">
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = "/placeholder-product.png";
                  }}
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
          );
        })}

        {previewProducts.length === 0 && (
          <div className="col-span-2 rounded-xl bg-white p-8 text-center text-sm text-gray-500">
            Próximamente productos en esta categoría.
          </div>
        )}
      </div>
    </Link>
  );
}
