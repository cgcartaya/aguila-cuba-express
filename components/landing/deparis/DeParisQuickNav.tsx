"use client";

import { useEffect, useRef, useState } from "react";

type Tab = { id: string; label: string };

type Props = {
  /** Qué pestañas mostrar. Por defecto muestra las tres — pensado
   *  para poder reusar este mismo componente en otro tenant que solo
   *  tenga, por ejemplo, bar (sin restaurante) o que no tenga mercado. */
  showRestaurante?: boolean;
  showBar?: boolean;
  showMercado?: boolean;
};

const ALL_TABS: Record<"restaurante" | "bar" | "mercado", Tab> = {
  restaurante: { id: "restaurante", label: "Restaurante" },
  bar: { id: "bar", label: "Bar" },
  mercado: { id: "mercado", label: "Mercado" },
};

// Barra de "categorías" sticky para moverse rápido por la landing —
// mismo patrón visual y de scrollspy que la barra de categorías de
// /menu/[slug] (pill horizontal, pegada arriba al hacer scroll,
// resalta sola la sección que se está viendo). Queda pegada justo
// debajo del navbar (top-[74px], la altura real del navbar de De
// Paris) y en móvil se puede desplazar horizontalmente si hiciera
// falta.
export default function DeParisQuickNav({
  showRestaurante = true,
  showBar = true,
  showMercado = true,
}: Props) {
  const tabs: Tab[] = [
    showRestaurante && ALL_TABS.restaurante,
    showBar && ALL_TABS.bar,
    showMercado && ALL_TABS.mercado,
  ].filter(Boolean) as Tab[];

  const [activeId, setActiveId] = useState<string | null>(tabs[0]?.id ?? null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (tabs.length === 0) return;

    const sections = tabs
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
  }, [tabs.length]);

  if (tabs.length < 2) return null;

  return (
    <nav className="scrollbar-none sticky top-[74px] z-40 flex gap-2 overflow-x-auto border-b border-[#1B1410]/10 bg-[#FFF4D6]/90 px-5 py-3 shadow-[0_8px_24px_rgba(27,20,16,0.06)] backdrop-blur-xl sm:px-8">
      {tabs.map((tab) => {
        const active = activeId === tab.id;
        return (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              active
                ? "border-[#1B1410] bg-[#1B1410] text-[#FFF4D6]"
                : "border-[#1B1410]/15 text-[#1B1410]/60 hover:border-[#FC6C26]/40 hover:text-[#1B1410]"
            }`}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
