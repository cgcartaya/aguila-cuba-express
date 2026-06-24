"use client";

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
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#061b3a]">
            Explora por categoría
          </h2>

          <p className="text-sm font-semibold text-slate-500">
            Encuentra rápido lo que tu familia necesita.
          </p>
        </div>
      </div>

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