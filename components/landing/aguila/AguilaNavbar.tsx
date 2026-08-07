"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { LogIn, MessageCircle, Menu, Store, X } from "lucide-react";

import { NAV_LINKS, STORE_URL, WHATSAPP_URL } from "./constants";

export default function AguilaNavbar({ logoUrl }: { logoUrl?: string | null } = {}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const resolvedLogo = logoUrl || "/logo.webp";

  return (
    <header className="sticky top-0 z-50 border-b border-[#0d1b30]/10 bg-[#f6f1e4]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#0d1b30]/10">
            <Image src={resolvedLogo} alt="Aguila Express USA" width={64} height={64} priority className="h-9 w-9 object-contain" />
          </div>
          <div className="min-w-0 leading-none">
            <p className="truncate text-[15px] font-black tracking-tight sm:text-base">
              AGUILA <span className="text-[#c31f2e]">EXPRESS USA</span>
            </p>
            <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#0d1b30]/45 sm:text-[10px]">
              Paquetería · Compras · Envíos
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-extrabold lg:flex">
          {NAV_LINKS.map((item) => (
            <Link key={item.label} href={item.href} className="text-[#0d1b30]/75 transition hover:text-[#c31f2e]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-black text-[#0d1b30]/70 transition hover:text-[#0d1b30]"
          >
            <LogIn size={16} /> Iniciar sesión
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#0d1b30]/15 px-4 py-2.5 text-sm font-black text-[#0d1b30] transition hover:bg-white"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
          {/* Store access is the priority action in the header: loudest color, listed last so it reads as the destination CTA. */}
          <Link
            href={STORE_URL}
            className="inline-flex items-center gap-2 rounded-full bg-[#c31f2e] px-5 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(195,31,46,.28)] transition hover:-translate-y-0.5 hover:bg-[#a91826]"
          >
            <Store size={16} /> Ir a la tienda
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={STORE_URL}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-[#c31f2e] px-4 text-sm font-black text-white shadow-[0_10px_24px_rgba(195,31,46,.28)]"
          >
            <Store size={16} /> Tienda
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0d1b30] text-white"
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-[#0d1b30]/10 bg-[#f6f1e4] px-5 py-4 lg:hidden">
          <nav className="grid gap-1 text-sm font-extrabold text-[#0d1b30]/80">
            {NAV_LINKS.map((item) => (
              <Link key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 hover:bg-white">
                {item.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setMenuOpen(false)} className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#0d1b30]/15 px-4 py-3">
              <LogIn size={17} /> Iniciar sesión
            </Link>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0d1b30] px-4 py-3 text-white"
            >
              <MessageCircle size={17} /> Contactar por WhatsApp
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
