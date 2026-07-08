"use client";

import { useState } from "react";
import { demoUrl, whatsappUrl } from "./links";

const navLinks = [
  { label: "Funciones", href: "#funciones" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Clientes", href: "#clientes" },
  { label: "Login", href: "/admin" },
];

export default function PerlaHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050b18]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-xl font-black text-slate-950 shadow-lg shadow-cyan-400/30">
            P
          </div>

          <div>
            <p className="text-base font-black leading-tight sm:text-lg">
              Perla Marketplace
            </p>
            <p className="text-xs font-semibold text-cyan-300">
              SaaS para tiendas online
            </p>
          </div>
        </a>

        <nav className="hidden items-center gap-7 text-sm font-bold text-white/75 lg:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-cyan-300">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={demoUrl}
            target="_blank"
            className="rounded-xl border border-white/15 px-5 py-3 text-sm font-black hover:border-cyan-300/70"
          >
            Ver demo
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-400/20"
          >
            Crear tienda
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="rounded-xl border border-white/15 px-3 py-2 text-2xl lg:hidden"
          aria-label="Abrir menú"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-[#071225] px-5 py-5 lg:hidden">
          <nav className="flex flex-col gap-4 font-bold text-white/80">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}

            <a
              href={whatsappUrl}
              target="_blank"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-center font-black text-slate-950"
            >
              Crear tienda
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
