"use client";

import { useEffect, useRef, useState } from "react";

import { STORE_URL } from "./constants";

type Tab = { id: string; label: string; href: string; anchor: boolean };

type Props = {
  showPizzas?: boolean;
  showCocina?: boolean;
  showTienda?: boolean;
};

const ALL_TABS: Record<"pizzas" | "cocina" | "tienda", Tab> = {
  pizzas: { id: "pizzas", label: "Pizzas", href: "#pizzas", anchor: true },
  cocina: { id: "cocina", label: "Cocina & bebidas", href: "#cocina", anchor: true },
  tienda: { id: "tienda", label: "Tienda", href: STORE_URL, anchor: false },
};

/**
 * Mismo patrón de scrollspy que /menu/[slug] y el resto de las
 * landings de la plataforma: pills pegadas debajo del navbar,
 * resaltando sola la sección visible.
 */
export default function JotaJotaQuickNav({
  showPizzas = true,
  showCocina = true,
  showTienda = true,
}: Props) {
  const tabs: Tab[] = [
    showPizzas && ALL_TABS.pizzas,
    showCocina && ALL_TABS.cocina,
    showTienda && ALL_TABS.tienda,
  ].filter(Boolean) as Tab[];

  const anchorTabs = tabs.filter((t) => t.anchor);

  const [activeId, setActiveId] = useState<string | null>(anchorTabs[0]?.id ?? null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (anchorTabs.length === 0) return;

    const sections = anchorTabs
      .map((tab) => document.getElementById(tab.id))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    sections.forEach((section) => observerRef.current?.observe(section));
    return () => observerRef.current?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorTabs.length]);

  if (tabs.length < 2) return null;

  return (
    <nav className="scrollbar-none sticky top-[73px] z-40 flex gap-2 overflow-x-auto border-b border-white/10 bg-[#0B0A08]/90 px-5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-8">
      {tabs.map((tab) => {
        const active = tab.anchor && activeId === tab.id;
        return (
          <a
            key={tab.id}
            href={tab.href}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              active
                ? "border-[#FEBB1B] bg-[#FEBB1B] text-[#0B0A08]"
                : "border-white/15 text-white/55 hover:border-[#FEBB1B]/50 hover:text-white"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
