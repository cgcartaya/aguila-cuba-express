"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import PerlaLogo from "./PerlaLogo";
import { whatsappUrl } from "./links";

const navItems = [
  ["Características", "#caracteristicas"],
  ["Cómo funciona", "#como-funciona"],
  ["Planes", "#planes"],
  ["Demos", "#clientes"],
  ["Login", "/admin"],
];

export default function PerlaHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-4 z-50 px-4 lg:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-3xl border border-white/70 bg-white/85 px-5 py-3 shadow-2xl shadow-violet-100/80 backdrop-blur-2xl lg:px-6">
        <PerlaLogo />

        <nav className="hidden items-center gap-8 text-sm font-black text-[#101a4d]/75 lg:flex">
          {navItems.map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="relative transition hover:text-violet-600 after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-violet-600 after:transition-all hover:after:w-full"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={whatsappUrl}
            target="_blank"
            className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3 text-sm font-black text-white shadow-xl shadow-violet-400/30 transition hover:-translate-y-0.5 hover:shadow-violet-500/40"
          >
            Crear mi tienda
          </a>
        </div>

        <button
          onClick={() => setOpen((value) => !value)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-100 bg-white/80 text-[#081044] shadow-sm lg:hidden"
          aria-label="Abrir menú"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-3 max-w-7xl rounded-3xl border border-violet-100 bg-white/95 px-5 py-5 shadow-2xl shadow-violet-100/80 backdrop-blur-2xl lg:hidden">
          <nav className="flex flex-col gap-4 text-sm font-black text-[#101a4d]/80">
            {navItems.map(([label, href]) => (
              <a key={label} href={href} onClick={() => setOpen(false)}>
                {label}
              </a>
            ))}

            <a
              href={whatsappUrl}
              target="_blank"
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-4 text-center font-black text-white shadow-lg shadow-violet-400/25"
            >
              Crear mi tienda
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
