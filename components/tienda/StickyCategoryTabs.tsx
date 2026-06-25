"use client";

/* =========================================================
   STICKY CATEGORY TABS

   Características:

   - Sticky horizontal.
   - Scroll suave.
   - Detecta automáticamente la sección visible.
   - Mantiene sincronizada la pestaña activa.
   - Hace scroll automático de las pestañas.
========================================================= */

import { useEffect, useRef, useState } from "react";

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

export default function StickyCategoryTabs({
  categories,
}: Props) {
  const [activeCategory, setActiveCategory] =
    useState(categories[0]);

  const tabsContainerRef = useRef<HTMLDivElement>(null);

  /* =========================================================
     DETECTAR SECCIÓN VISIBLE
  ========================================================= */

  useEffect(() => {
    const handleScroll = () => {
      let currentCategory = categories[0];

      categories.forEach((category) => {
        const element =
          document.getElementById(category);

        if (!element) return;

        const rect =
          element.getBoundingClientRect();

        /*
          Ajusta este valor si cambias la altura
          del header sticky.
        */

        if (rect.top <= 250) {
          currentCategory = category;
        }
      });

      setActiveCategory(currentCategory);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    handleScroll();

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [categories]);

  /* =========================================================
     SCROLL AUTOMÁTICO DE LAS TABS
  ========================================================= */

  useEffect(() => {
    const container = tabsContainerRef.current;

    if (!container) return;

    const activeButton =
      container.querySelector<HTMLButtonElement>(
        `[data-category="${activeCategory}"]`
      );

    if (!activeButton) return;

    activeButton.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeCategory]);

  /* =========================================================
     SCROLL HACIA CATEGORÍA
  ========================================================= */

  const scrollToCategory = (
    category: string
  ) => {
    const section =
      document.getElementById(category);

    if (!section) return;

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="sticky top-[72px] z-30 -mx-4 border-y bg-white px-4 py-3 shadow-sm">
      <div
        ref={tabsContainerRef}
        className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category) => {
          const colorClass =
            categoryStyles[category] ||
            "bg-slate-600 text-white";

          const isActive =
            activeCategory === category;

          return (
            <button
              key={category}
              data-category={category}
              onClick={() =>
                scrollToCategory(category)
              }
              className={`
                shrink-0
                whitespace-nowrap
                rounded-2xl
                px-6
                py-3
                text-sm
                font-black
                shadow-md
                transition-all
                duration-300
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