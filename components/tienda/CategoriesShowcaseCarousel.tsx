"use client";

import { Grid3X3 } from "lucide-react";

import CategoryShowcaseCard from "./CategoryShowcaseCard";
import type { Product } from "@/types/cart";

type CategoryGroup = {
  categoria: string;
  productos: Product[];
};

type Props = {
  groups: CategoryGroup[];
};

export default function CategoriesShowcaseCarousel({
  groups,
}: Props) {
  const visibleGroups = groups.filter(
    (group) => group.productos.length > 0
  );

  if (visibleGroups.length === 0) return null;

  return (
    <section className="py-4">

      {/* =========================================================
         HEADER SUPERIOR
      ========================================================= */}

      <div className="mb-5 rounded-3xl bg-gradient-to-r from-sky-400 via-blue-500 to-blue-600 p-5 shadow-lg">

        <div className="flex items-center gap-4">

          {/* Icono */}

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <Grid3X3 className="h-7 w-7 text-white" />
          </div>

          {/* Texto */}

          <div className="flex-1">
            <h2 className="text-2xl font-black text-white">
              Explora por categoría
            </h2>

            <p className="mt-1 text-sm font-medium text-blue-50">
              Encuentra rápidamente todo lo que tu familia necesita.
            </p>
          </div>
        </div>

        {/* Badges */}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            🚚 Entregas rápidas
          </span>

          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            🛡️ Compra segura
          </span>

          <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur">
            📦 {visibleGroups.length} categorías
          </span>
        </div>
      </div>

      {/* =========================================================
         CARRUSEL DE CATEGORÍAS
      ========================================================= */}

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {visibleGroups.map((group) => (
          <CategoryShowcaseCard
            key={group.categoria}
            category={group.categoria}
            products={group.productos}
          />
        ))}

      </div>
    </section>
  );
}