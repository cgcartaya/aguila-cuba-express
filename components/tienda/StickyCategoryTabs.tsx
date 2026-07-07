"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type StickyCategory = {
  name: string;
  color?: string | null;
};

type Props = {
  categories: StickyCategory[];
};

const HEADER_OFFSET = 58;
const SCROLL_OFFSET = 116;

export default function StickyCategoryTabs({ categories }: Props) {
  const filteredCategories = useMemo(() => {
    return categories.filter((category) => category.name?.trim());
  }, [categories]);

  const [activeCategory, setActiveCategory] = useState(
    filteredCategories[0]?.name || ""
  );

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isClickScrollingRef = useRef(false);

  useEffect(() => {
    setActiveCategory(filteredCategories[0]?.name || "");
  }, [filteredCategories]);

  useEffect(() => {
    if (filteredCategories.length === 0) return;

    let ticking = false;

    const handleScroll = () => {
      if (isClickScrollingRef.current || ticking) return;

      ticking = true;

      window.requestAnimationFrame(() => {
        let currentCategory = filteredCategories[0]?.name || "";

        filteredCategories.forEach((category) => {
          const element = document.getElementById(category.name);
          if (!element) return;

          const rect = element.getBoundingClientRect();

          if (rect.top <= SCROLL_OFFSET + 20) {
            currentCategory = category.name;
          }
        });

        setActiveCategory(currentCategory);
        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [filteredCategories]);

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container || !activeCategory) return;

    const activeButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[data-category]")
    ).find((button) => button.dataset.category === activeCategory);

    if (!activeButton) return;

    const left =
      activeButton.offsetLeft -
      container.clientWidth / 2 +
      activeButton.clientWidth / 2;

    container.scrollTo({
      left: Math.max(0, left),
      behavior: "smooth",
    });
  }, [activeCategory]);

  const scrollToCategory = (category: string) => {
    const section = document.getElementById(category);
    if (!section) return;

    setActiveCategory(category);
    isClickScrollingRef.current = true;

    const y =
      section.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;

    window.scrollTo({
      top: Math.max(0, y),
      behavior: "smooth",
    });

    window.setTimeout(() => {
      isClickScrollingRef.current = false;
    }, 700);
  };

  if (filteredCategories.length === 0) return null;

  return (
    <div className="-mx-4 bg-white px-4 py-2 shadow-sm">
      <div
        ref={tabsContainerRef}
        className="flex max-w-full gap-2 overflow-x-auto overflow-y-hidden pb-1 pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {filteredCategories.map((category) => {
          const isActive = activeCategory === category.name;
          const backgroundColor = category.color || "#475569";

          return (
            <button
              key={category.name}
              type="button"
              data-category={category.name}
              onClick={() => scrollToCategory(category.name)}
              style={{
                backgroundColor,
              }}
              className={`
                shrink-0
                whitespace-nowrap
                rounded-2xl
                px-5
                py-2
                text-xs
                font-black
                text-white
                shadow-md
                transition-all
                duration-200
                sm:text-sm
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