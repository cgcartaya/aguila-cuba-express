"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingBag, UtensilsCrossed, Wine } from "lucide-react";

type Tab = {
  id: string;
  label: string;
  icon: typeof UtensilsCrossed;
};

type Props = {
  /** Qué pestañas mostrar. Por defecto muestra las tres — pensado
   *  para poder reusar este mismo componente en otro tenant que solo
   *  tenga, por ejemplo, bar (sin restaurante) o que no tenga mercado. */
  showRestaurante?: boolean;
  showBar?: boolean;
  showMercado?: boolean;
};

const ALL_TABS: Record<"restaurante" | "bar" | "mercado", Tab> = {
  restaurante: { id: "restaurante", label: "Restaurante", icon: UtensilsCrossed },
  bar: { id: "bar", label: "Bar", icon: Wine },
  mercado: { id: "mercado", label: "Mercado", icon: ShoppingBag },
};

// Barra de navegación rápida ("dos/tres taps") para moverse entre las
// secciones de la landing sin tener que hacer scroll manual. Se queda
// pegada debajo del navbar principal y resalta sola la pestaña de la
// sección que se está viendo (mismo patrón de IntersectionObserver ya
// usado en MenuPageClient para las categorías — sin librerías nuevas).
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
    <div className="sticky top-[74px] z-40 flex justify-center bg-[#FFF4D6]/0 py-3">
      <nav className="flex items-center gap-1 rounded-full border border-[#1B1410]/10 bg-white/85 p-1 shadow-[0_10px_28px_rgba(27,20,16,0.1)] backdrop-blur-md">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeId === tab.id;
          return (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                active
                  ? "bg-[#1B1410] text-[#FFF4D6]"
                  : "text-[#1B1410]/60 hover:bg-[#1B1410]/5 hover:text-[#1B1410]"
              }`}
            >
              <Icon size={14} className={active ? "text-[#FC6C26]" : ""} />
              {tab.label}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
