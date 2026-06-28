"use client";

/* =========================================================
   CATEGORIES SHOWCASE CAROUSEL

   Correcciones:
   - Mejor responsive para iPhone.
   - Padding lateral seguro.
   - Evita desbordes horizontales.
========================================================= */

import { Grid3X3 } from "lucide-react";

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
  if (!groups || groups.length === 0) return null;

  return (
    <section className="w-full overflow-hidden px-4 py-4">
      <div className="mb-4 rounded-3xl bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 p-4 shadow-lg">
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

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => (
          <CategoryShowcaseCard
            key={group.categoria}
            category={group.categoria}
            color={group.color}
            products={group.productos}
          />
        ))}
      </div>
    </section>
  );
}