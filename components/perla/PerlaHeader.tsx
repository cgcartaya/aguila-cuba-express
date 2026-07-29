"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu } from "lucide-react";
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
  const [compact, setCompact] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const closeMenus = useCallback(() => setActiveMenu(null), []);

  useEffect(() => {
    const updateHeader = () => setCompact(window.scrollY > 28);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

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
        className={`sticky z-50 px-4 transition-all duration-300 lg:px-6 ${
          compact ? "top-2" : "top-4"
        }`}
      >
        <motion.div
          layout
          transition={{ duration: 0.22, ease: "easeOut" }}
          className={`relative mx-auto flex max-w-7xl items-center justify-between border border-white/75 bg-white/88 shadow-[0_18px_55px_rgba(87,58,155,0.14)] backdrop-blur-2xl transition-all duration-300 ${
            compact
              ? "rounded-[22px] px-4 py-2 lg:px-5"
              : "rounded-[28px] px-5 py-3 lg:px-6"
          }`}
        >
          <div className={compact ? "origin-left scale-[0.94]" : ""}>
            <PerlaLogo />
          </div>

          <nav
            aria-label="Navegación principal"
            className="hidden items-center gap-1 lg:flex"
            onMouseLeave={() => {
              window.setTimeout(() => {
                if (!headerRef.current?.matches(":hover")) closeMenus();
              }, 80);
            }}
          >
            {primaryNavigation.map((item) => {
              if ("href" in item) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onFocus={closeMenus}
                    className="flex min-h-11 items-center rounded-xl px-3 text-sm font-black text-[#101a4d]/75 outline-none transition hover:bg-violet-50 hover:text-violet-700 focus-visible:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-400"
                  >
                    {item.label}
                  </Link>
                );
              }

              const isOpen = activeMenu === item.menu;
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setActiveMenu(item.menu)}
                >
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.menu)}
                    onFocus={() => setActiveMenu(item.menu)}
                    className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-black text-[#101a4d]/75 outline-none transition hover:bg-violet-50 hover:text-violet-700 focus-visible:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-400"
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    aria-controls={`mega-menu-${item.menu}`}
                  >
                    {item.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <MegaMenu
                        id={`mega-menu-${item.menu}`}
                        groups={
                          item.menu === "platform" ? platformGroups : undefined
                        }
                        items={
                          item.menu === "solutions"
                            ? solutions
                            : item.menu === "resources"
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

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/admin"
              className="flex min-h-11 items-center rounded-xl px-4 text-sm font-black text-[#101a4d] outline-none transition hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-200"
            >
              Iniciar sesión
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-black text-white shadow-lg shadow-violet-300/35 outline-none transition hover:-translate-y-0.5 hover:shadow-violet-400/45 focus-visible:ring-4 focus-visible:ring-violet-300"
            >
              Solicitar demo
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-100 bg-white text-[#081044] shadow-sm outline-none transition hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-200 lg:hidden"
            aria-label="Abrir menú"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </motion.div>
      </header>

      <MobileMenu
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        demoHref={whatsappUrl}
      />
    </>
  );
}
