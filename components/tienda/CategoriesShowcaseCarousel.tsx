"use client";

import { ArrowRight, Grid3X3, ShieldCheck, Truck } from "lucide-react";

import CategoryShowcaseCard from "./CategoryShowcaseCard";
import type { Product } from "@/types/cart";

type CategoryGroup = {
  categoria: string;
  productos: Product[];
};

type Props = {
  groups: CategoryGroup[];
};

export default function CategoriesShowcaseCarousel({ groups }: Props) {
  const visibleGroups = groups.filter((group) => group.productos.length > 0);

  if (visibleGroups.length === 0) return null;

  return (
    <section className="py-4">
      <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 shadow-sm">
            <Grid3X3 size={28} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              Compra organizada
            </div>

            <h2 className="text-3xl font-black leading-tight text-[#061b3a]">
              Explora por categoría
            </h2>

            <p className="mt-2 max-w-[520px] text-sm font-semibold leading-relaxed text-slate-500">
              Encuentra rápido alimentos, medicinas, hogar y más para enviar a
              tu familia en Cuba.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                <Truck size={13} />
                Entregas rápidas
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                <ShieldCheck size={13} />
                Compra segura
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                {visibleGroups.length} categorías
              </span>
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 text-sm font-black text-red-600 sm:flex">
            Desliza
            <ArrowRight size={18} />
          </div>
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