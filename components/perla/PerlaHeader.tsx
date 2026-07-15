"use client";

import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import PerlaLogo from "./PerlaLogo";
import { ADMIN_PATH, DEMO_PATH } from "./links";

const navItems = [
  ["Plataforma", "#plataforma"],
  ["Soluciones", "#soluciones"],
  ["Cómo funciona", "#como-funciona"],
  ["Precios", "#planes"],
  ["Preguntas", "#preguntas"],
];

export default function PerlaHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 lg:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-4 py-3 shadow-xl shadow-violet-950/5 backdrop-blur-xl lg:px-6">
        <PerlaLogo />

        <nav className="hidden items-center gap-7 text-sm font-extrabold text-slate-600 lg:flex">
          {navItems.map(([label, href]) => (
            <a key={label} href={href} className="transition hover:text-violet-600">
              {label}
            </a>
          ))}
          <a href={ADMIN_PATH} className="transition hover:text-violet-600">Login</a>
        </nav>

        <a href={DEMO_PATH} className="hidden items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 lg:inline-flex">
          Solicitar demo <ArrowRight size={17} />
        </a>

        <button type="button" onClick={() => setOpen(!open)} className="rounded-xl border border-slate-200 p-2 lg:hidden" aria-label="Abrir menú">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-7xl rounded-2xl border border-violet-100 bg-white p-4 shadow-2xl lg:hidden">
          <nav className="grid gap-2">
            {navItems.map(([label, href]) => (
              <a key={label} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 font-bold text-slate-700 hover:bg-violet-50">
                {label}
              </a>
            ))}
            <a href={ADMIN_PATH} className="rounded-xl px-4 py-3 font-bold text-slate-700">Login</a>
            <a href={DEMO_PATH} className="mt-2 rounded-xl bg-violet-600 px-4 py-3 text-center font-black text-white">Solicitar demo</a>
          </nav>
        </div>
      )}
    </header>
  );
}
