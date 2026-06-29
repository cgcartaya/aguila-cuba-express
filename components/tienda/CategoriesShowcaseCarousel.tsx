"use client";

/* =========================================================
   CATEGORIES SHOWCASE CAROUSEL

   Características:

   ✓ Swipe móvil.
   ✓ Flechas desktop.
   ✓ Scroll horizontal suave.
   ✓ Compatible Safari.
   ✓ Mantiene efecto:
     una tarjeta + pedazo siguiente.
========================================================= */

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Grid3X3 } from "lucide-react";

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

export default function CategoriesShowcaseCarousel({
  groups,
}: Props) {
  const scrollContainerRef =
    useRef<HTMLDivElement>(null);

  if (!groups || groups.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const amount = 420;

    scrollContainerRef.current.scrollBy({
      left:
        direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative w-full overflow-hidden py-4">

      {/* ==========================================
          CABECERA
      ========================================== */}

      <div className="mx-4 mb-4 rounded-3xl bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Grid3X3 className="h-6 w-6 text-white" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black leading-tight text-white">
              Explora por categoría
            </h2>

            <p className="mt-1 text-sm text-blue-50">
              Encuentra rápidamente todo lo que tu familia necesita.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            🚚 Entregas rápidas
          </span>

          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            📦 {groups.length} categorías
          </span>
        </div>
      </div>

      {/* ==========================================
          FLECHA IZQUIERDA (SOLO DESKTOP)
      ========================================== */}

      <button
        onClick={() => scroll("left")}
        className="
          absolute
          left-2
          top-1/2
          z-20
          hidden
          h-12
          w-12
          -translate-y-1/2
          items-center
          justify-center
          rounded-full
          bg-white/95
          shadow-xl
          transition
          hover:scale-105
          lg:flex
        "
      >
        <ChevronLeft className="h-6 w-6 text-slate-700" />
      </button>

      {/* ==========================================
          CARRUSEL
      ========================================== */}

      <div
        ref={scrollContainerRef}
        className="
          flex
          snap-x
          snap-mandatory
          gap-4
          overflow-x-auto
          px-4
          pb-4
          scroll-smooth

          [-ms-overflow-style:none]
          [scrollbar-width:none]

          [&::-webkit-scrollbar]:hidden
        "
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

      {/* ==========================================
          FLECHA DERECHA (SOLO DESKTOP)
      ========================================== */}

      <button
        onClick={() => scroll("right")}
        className="
          absolute
          right-2
          top-1/2
          z-20
          hidden
          h-12
          w-12
          -translate-y-1/2
          items-center
          justify-center
          rounded-full
          bg-white/95
          shadow-xl
          transition
          hover:scale-105
          lg:flex
        "
      >
        <ChevronRight className="h-6 w-6 text-slate-700" />
      </button>
    </section>
  );
}