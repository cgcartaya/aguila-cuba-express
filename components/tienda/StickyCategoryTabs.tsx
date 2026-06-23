"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  categories: string[];
};

export default function StickyCategoryTabs({
  categories,
}: Props) {
  const [activeCategory, setActiveCategory] =
    useState(categories[0]);

  const observerRef = useRef<IntersectionObserver | null>(
    null
  );

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveCategory(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-150px 0px -60% 0px",
      }
    );

    categories.forEach((category) => {
      const element = document.getElementById(
        category
      );

      if (element) {
        observerRef.current?.observe(element);
      }
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [categories]);

  const scrollToCategory = (category: string) => {
    const section = document.getElementById(
      category
    );

    if (!section) return;

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="sticky top-[72px] z-30 -mx-4 border-y bg-white px-4 py-3 shadow-sm">
      <div className="flex gap-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() =>
              scrollToCategory(category)
            }
            className={`
              whitespace-nowrap rounded-full px-5 py-2 text-sm font-black transition
              ${
                activeCategory === category
                  ? "bg-[#061b3a] text-white"
                  : "bg-slate-100 text-slate-600"
              }
            `}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}