"use client";

import { ShieldCheck, ShoppingBag, Sparkles, Truck } from "lucide-react";

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
      <div className="mb-5 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#061b3a] via-[#0b2f63] to-[#144a96] p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 animate-category-icon items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur">
              <ShoppingBag size={28} />
            </div>

            <div>
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-white/90">
                <Sparkles size={13} />
                Compra organizada
              </div>

              <h2 className="text-2xl font-black text-white md:text-3xl">
                Explora por categoría
              </h2>

              <p className="mt-2 max-w-[460px] text-xs font-medium leading-relaxed text-blue-100 md:text-sm">
                Encuentra rápidamente alimentos, medicinas, artículos del hogar
                y mucho más para enviar a tu familia en Cuba.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
                  <Truck size={13} />
                  Entregas rápidas
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
                  <ShieldCheck size={13} />
                  Compra segura
                </span>

                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-white">
                  <Sparkles size={13} />
                  Productos verificados
                </span>
              </div>
            </div>
          </div>

          <div className="hidden rounded-2xl bg-white/10 px-4 py-3 text-right backdrop-blur md:block">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
              Disponible
            </p>

            <p className="text-2xl font-black text-white">
              {visibleGroups.length}
            </p>

            <p className="text-xs font-semibold text-blue-100">
              Categorías
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-100 md:text-sm">
          <span>👉</span>
          <span>Desliza para descubrir más categorías</span>
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

      <style jsx>{`
        .animate-category-icon {
          animation: categoryIconFloat 3s ease-in-out infinite;
        }

        @keyframes categoryIconFloat {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </section>
  );
}