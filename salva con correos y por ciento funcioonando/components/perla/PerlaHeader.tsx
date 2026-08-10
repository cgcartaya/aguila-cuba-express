"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronDown, Menu } from "lucide-react";
import PerlaLogo from "./PerlaLogo";
import MegaMenu from "./MegaMenu";
import MobileMenu from "./MobileMenu";
import {
  platformGroups,
  primaryNavigation,
  resources,
  solutions,
  type MenuKey,
} from "./navigation";

const whatsappUrl =
  "https://wa.me/13054974891?text=Hola,%20quiero%20solicitar%20una%20demo%20de%20Perla%20Marketplace.";

export default function PerlaHeader() {
  const [activeMenu, setActiveMenu] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const closeMenus = useCallback(() => setActiveMenu(null), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenus();
        setMobileOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        activeMenu &&
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        closeMenus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activeMenu, closeMenus]);

  const toggleMenu = (menu: MenuKey) => {
    setActiveMenu((current) => (current === menu ? null : menu));
  };

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 backdrop-blur-xl"
      >
        <div className="relative mx-auto flex min-h-[104px] max-w-[1440px] items-center justify-between px-5 lg:px-8">
          <PerlaLogo />

          <nav
            aria-label="Navegación principal"
            className="hidden h-full items-center gap-7 lg:flex"
          >
            {primaryNavigation.map((item) => {
              if (item.type === "link") {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onFocus={closeMenus}
                    className="flex min-h-12 items-center border-b-2 border-transparent px-1 text-[15px] font-black text-[#10152f] outline-none transition hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-200"
                  >
                    {item.label}
                  </Link>
                );
              }

              const menu = item.menu;
              const isOpen = activeMenu === menu;

              return (
                <div
                  key={item.label}
                  className="relative flex h-[104px] items-center"
                  onMouseEnter={() => setActiveMenu(menu)}
                >
                  <button
                    type="button"
                    onClick={() => toggleMenu(menu)}
                    onFocus={() => setActiveMenu(menu)}
                    className={`flex min-h-12 items-center gap-2 border-b-2 px-1 text-[15px] font-black outline-none transition focus-visible:ring-4 focus-visible:ring-violet-200 ${
                      isOpen
                        ? "border-violet-600 text-violet-700"
                        : "border-transparent text-[#10152f] hover:text-violet-700"
                    }`}
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    aria-controls={`mega-menu-${menu}`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <MegaMenu
                        id={`mega-menu-${menu}`}
                        groups={menu === "platform" ? platformGroups : undefined}
                        items={
                          menu === "solutions"
                            ? solutions
                            : menu === "resources"
                              ? resources
                              : undefined
                        }
                        onNavigate={closeMenus}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            <Link
              href="/admin"
              className="flex min-h-12 items-center px-2 text-sm font-black text-[#10152f] outline-none hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-200"
            >
              Iniciar sesión
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center gap-3 rounded-xl bg-gradient-to-r from-[#5420e8] to-[#8b2cff] px-6 text-sm font-black text-white shadow-lg shadow-violet-300/35 outline-none transition hover:-translate-y-0.5 hover:shadow-violet-400/45 focus-visible:ring-4 focus-visible:ring-violet-300"
            >
              Solicitar una demo
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#10152f] shadow-sm outline-none hover:bg-slate-50 focus-visible:ring-4 focus-visible:ring-violet-200 lg:hidden"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        demoHref={whatsappUrl}
      />
    </>
  );
}
