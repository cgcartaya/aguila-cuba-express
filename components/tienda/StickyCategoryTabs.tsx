"use client";

/* =========================================================
   STICKY CATEGORY TABS

   Ahora las categorías son totalmente dinámicas.

   - Categorías creadas desde Admin.
   - Colores controlados desde Supabase.
   - Scroll automático.
   - Detección automática de sección activa.
========================================================= */

import { useEffect, useRef, useState } from "react";

export type StickyCategory = {
  name: string;
  color?: string | null;
};

type Props = {
  categories: StickyCategory[];
};

export default function StickyCategoryTabs({
  categories,
}: Props) {
  const [activeCategory, setActiveCategory] =
    useState(categories[0]?.name || "");

  const tabsContainerRef = useRef<HTMLDivElement>(null);

  /* =========================================================
     DETECTAR SECCIÓN VISIBLE
  ========================================================= */

  useEffect(() => {
    if (categories.length === 0) return;

    const handleScroll = () => {
      let currentCategory =
        categories[0]?.name || "";

      categories.forEach((category) => {
        const element =
          document.getElementById(category.name);

        if (!element) return;

        const rect =
          element.getBoundingClientRect();

        if (rect.top <= 250) {
          currentCategory = category.name;
        }
      });

      setActiveCategory(currentCategory);
    };

    window.addEventListener(
      "scroll",
      handleScroll
    );

    handleScroll();

    return () =>
      window.removeEventListener(
        "scroll",
        handleScroll
      );
  }, [categories]);

  /* =========================================================
     CENTRAR TAB ACTIVA
  ========================================================= */

 useEffect(() => {
  const container = tabsContainerRef.current;

  if (!container) return;

  const activeButton =
    container.querySelector<HTMLButtonElement>(
      `[data-category="${activeCategory}"]`
    );

  if (!activeButton) return;

  const left =
    activeButton.offsetLeft -
    container.clientWidth / 2 +
    activeButton.clientWidth / 2;

  container.scrollTo({
    left,
    behavior: "smooth",
  });
}, [activeCategory]);

  /* =========================================================
     SCROLL A CATEGORÍA
  ========================================================= */

  const scrollToCategory = (
    category: string
  ) => {
    const section =
      document.getElementById(category);

    if (!section) return;

  const scrollToCategory = (category: string) => {
  const section = document.getElementById(category);

  if (!section) return;

  const headerOffset = 120;

  const y =
    section.getBoundingClientRect().top +
    window.scrollY -
    headerOffset;

  window.scrollTo({
    top: y,
    behavior: "smooth",
  });
};
  };

  return (
    <div className="sticky top-[76px] z-40 -mx-4 border-y bg-white px-4 py-3 shadow-sm">
      <div
        ref={tabsContainerRef}
        className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category) => {
          const isActive =
            activeCategory === category.name;

          return (
            <button
              key={category.name}
              data-category={category.name}
              onClick={() =>
                scrollToCategory(category.name)
              }
              style={{
                backgroundColor:
                  category.color || "#475569",
              }}
              className={`
                shrink-0
                whitespace-nowrap
                rounded-2xl
                px-6
                py-3
                text-sm
                font-black
                text-white
                shadow-md
                transition-all
                duration-300
                ${
                  isActive
                    ? "scale-105 ring-4 ring-black/10"
                    : "opacity-90 hover:scale-105 hover:opacity-100"
                }
              `}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}