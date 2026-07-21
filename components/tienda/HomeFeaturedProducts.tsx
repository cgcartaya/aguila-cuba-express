"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import ProductCard from "@/components/tienda/ProductCard";
import type { Product } from "@/types/cart";

type Props = {
  products: Product[];
  onAddToCart: (product: Product) => void;
  title?: string;
};

export default function HomeFeaturedProducts({
  products,
  onAddToCart,
  title = "Más vendidos y destacados",
}: Props) {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!products.length) return null;

  function scroll(direction: "left" | "right") {
    rowRef.current?.scrollBy({
      left: direction === "left" ? -520 : 520,
      behavior: "smooth",
    });
  }

  return (
    <section className="mx-auto mt-7 w-full max-w-[1600px] px-3 sm:px-4 lg:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <Sparkles size={18} />
          </span>
          <h2 className="truncate text-xl font-black text-[#061b3a] sm:text-2xl">
            {title}
          </h2>
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
            aria-label="Ver productos anteriores"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
            aria-label="Ver más productos"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="relative min-w-[172px] max-w-[172px] snap-start sm:min-w-[210px] sm:max-w-[210px] lg:min-w-[225px] lg:max-w-[225px]"
          >
            {product.home_featured_label?.trim() ? (
              <div className="absolute left-2 top-2 z-20 max-w-[calc(100%-1rem)] truncate rounded-md bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow">
                {product.home_featured_label}
              </div>
            ) : null}
            <ProductCard product={product} onAddToCart={onAddToCart} />
          </div>
        ))}
      </div>
    </section>
  );
}
