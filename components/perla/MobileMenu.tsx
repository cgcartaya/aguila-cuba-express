"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import PerlaLogo from "./PerlaLogo";
import {
  platformGroups,
  resources,
  solutions,
  type MenuKey,
  type NavigationItem,
} from "./navigation";

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  demoHref: string;
};

const mobileSections: {
  key: MenuKey;
  label: string;
  items: NavigationItem[];
}[] = [
  {
    key: "platform",
    label: "Plataforma",
    items: platformGroups.flatMap((group) => group.items),
  },
  { key: "solutions", label: "Soluciones", items: solutions },
  { key: "resources", label: "Recursos", items: resources },
];

export default function MobileMenu({
  open,
  onClose,
  demoHref,
}: MobileMenuProps) {
  const [expanded, setExpanded] = useState<MenuKey | null>("platform");

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menú principal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-[#071044]/45 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="absolute right-0 top-0 flex h-full w-[min(92vw,430px)] flex-col bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-violet-100 px-5 py-4">
              <PerlaLogo />
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-100 text-[#101a4d] outline-none transition hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-200"
                aria-label="Cerrar menú"
                autoFocus
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <nav aria-label="Navegación móvil" className="space-y-2">
                {mobileSections.map((section) => {
                  const isExpanded = expanded === section.key;

                  return (
                    <div
                      key={section.key}
                      className="overflow-hidden rounded-2xl border border-violet-100"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(isExpanded ? null : section.key)
                        }
                        className="flex min-h-14 w-full items-center justify-between px-4 text-left text-sm font-black text-[#101a4d] outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-200"
                        aria-expanded={isExpanded}
                        aria-controls={`mobile-${section.key}`}
                      >
                        {section.label}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            id={`mobile-${section.key}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-1 border-t border-violet-100 bg-violet-50/50 p-2">
                              {section.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                  <Link
                                    key={`${section.key}-${item.label}`}
                                    href={item.href}
                                    onClick={onClose}
                                    className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-[#394369] outline-none transition hover:bg-white focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-violet-400"
                                  >
                                    {Icon && (
                                      <Icon className="h-4 w-4 text-violet-600" />
                                    )}
                                    {item.label}
                                  </Link>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                <Link
                  href="#clientes"
                  onClick={onClose}
                  className="flex min-h-14 items-center rounded-2xl px-4 text-sm font-black text-[#101a4d] outline-none hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-200"
                >
                  Clientes
                </Link>
                <Link
                  href="#planes"
                  onClick={onClose}
                  className="flex min-h-14 items-center rounded-2xl px-4 text-sm font-black text-[#101a4d] outline-none hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-200"
                >
                  Precios
                </Link>
              </nav>
            </div>

            <div className="border-t border-violet-100 bg-white p-5">
              <div className="grid gap-3">
                <Link
                  href="/admin"
                  onClick={onClose}
                  className="flex min-h-12 items-center justify-center rounded-2xl border border-violet-200 text-sm font-black text-[#101a4d] outline-none hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-200"
                >
                  Iniciar sesión
                </Link>
                <a
                  href={demoHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onClose}
                  className="flex min-h-12 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 text-sm font-black text-white shadow-lg shadow-violet-300/35 outline-none transition hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-violet-300"
                >
                  Solicitar demo
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
