"use client";

/* =========================================================
   STICKY CATEGORY TABS

   Estilo tipo Amazon:
   - Cada categoría tiene su propio color.
   - Botones grandes, redondeados y llamativos.
   - La categoría activa resalta más.
========================================================= */

import { useEffect, useState } from "react";

type Props = {
  categories: string[];
};

const categoryStyles: Record<string, string> = {
  Combos: "bg-[#061b3a] text-white",
  Alimentos: "bg-green-500 text-white",
  Electrónicos: "bg-blue-500 text-white",
  Medicinas: "bg-purple-600 text-white",
  Hogar: "bg-orange-500 text-white",
  Ropa: "bg-pink-500 text-white",
  Aseo: "bg-cyan-500 text-white",
};

export default function StickyCategoryTabs({ categories }: Props) {
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  useEffect(() => {
    const handleScroll = () => {
      let currentCategory = categories[0];

      categories.forEach((category) => {
        const element = document.getElementById(category);

        if (!element) return;

        const rect = element.getBoundingClientRect();

        if (rect.top <= 220) {
          currentCategory = category;
        }
      });

      setActiveCategory(currentCategory);
    };

    window.addEventListener("scroll", handleScroll);

    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [categories]);

  const scrollToCategory = (category: string) => {
    const section = document.getElementById(category);

    if (!section) return;

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="sticky top-[72px] z-30 -mx-4 border-y bg-white px-4 py-3 shadow-sm">
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => {
          const colorClass =
            categoryStyles[category] || "bg-slate-600 text-white";

          const isActive = activeCategory === category;

          return (
            <button
              key={category}
              onClick={() => scrollToCategory(category)}
              className={`
                whitespace-nowrap
                rounded-2xl
                px-6
                py-3
                text-sm
                font-black
                shadow-md
                transition
                duration-200
                ${colorClass}
                ${
                  isActive
                    ? "scale-105 ring-4 ring-black/10"
                    : "opacity-90 hover:scale-105 hover:opacity-100"
                }
              `}
            >
              {category}
            </button>
          );
        })}
      </div>
    </div>
  );
}