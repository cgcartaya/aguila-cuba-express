"use client";

/* =========================================================
   CATEGORIES SHOWCASE CAROUSEL

   Header V2:
   - Se eliminó el bloque azul "Explora por categoría".
   - Solo queda el carrusel limpio de categorías.
========================================================= */

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import CategoryShowcaseCard from "./CategoryShowcaseCard";
import type { Product } from "@/types/cart";

type CategoryGroup = {
  categoria: string;
  color?: string | null;
  productos: Product[];
};

type Props = {
  groups: CategoryGroup[];
};

export default function CategoriesShowcaseCarousel({ groups }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!groups || groups.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const amount = 420;

    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative w-full overflow-hidden pt-4 pb-2">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute left-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-xl transition hover:scale-105 lg:flex"
        aria-label="Categorías anteriores"
      >
        <ChevronLeft className="h-6 w-6 text-slate-700" />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-4 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group) => (
          <CategoryShowcaseCard
            key={group.categoria}
            category={group.categoria}
            color={group.color}
            products={group.productos}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute right-2 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-xl transition hover:scale-105 lg:flex"
        aria-label="Categorías siguientes"
      >
        <ChevronRight className="h-6 w-6 text-slate-700" />
      </button>
    </section>
  );
}
