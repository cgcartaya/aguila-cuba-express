"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarCheck2, LogIn, Menu, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";

import { NAV_LINKS, RESERVAS_URL, STORE_URL } from "./constants";

export default function JotaJotaNavbar({
  menuHref,
  reservasHref = RESERVAS_URL,
}: {
  menuHref?: string;
  reservasHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const resolvedNavLinks = NAV_LINKS.map(([label, href]) =>
    label === "Pizzas" && menuHref ? ([label, menuHref] as const) : ([label, href] as const)
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0B0A08]/95 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl" : "bg-[#0B0A08]/70 backdrop-blur-md"
      }`}
    >
      {/* Filete diagonal — mismo corte que separa el "JOTA" blanco del dorado en el logo */}
      <div className="h-[3px] w-full bg-[repeating-linear-gradient(115deg,#FEBB1B_0px,#FEBB1B_18px,transparent_18px,transparent_30px)]" />

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="#inicio" className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-[#FEBB1B]/25">
            <Image src="/jotajota/logo.webp" alt="Jota Jota" fill priority className="object-cover" />
          </div>
          <div className="hidden leading-none sm:block">
            <p
              className="text-xl tracking-tight text-white"
              style={{ fontFamily: "var(--font-jj-display)" }}
            >
              JOTA JOTA
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.28em] text-[#FEBB1B]">
              Cocina Napolitana
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-bold uppercase tracking-[0.06em] text-white/75 lg:flex">
          {resolvedNavLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="relative py-1 transition hover:text-[#FEBB1B] [&:hover::after]:w-full after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-[#FEBB1B] after:transition-all after:duration-300"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-2 py-2.5 text-xs font-bold uppercase tracking-wide text-white/40 transition hover:text-white"
          >
            <LogIn size={15} /> Iniciar sesión
          </Link>
          <Link
            href={reservasHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:border-[#FEBB1B]/50 hover:bg-white/[0.08]"
          >
            <CalendarCheck2 size={16} className="text-[#FEBB1B]" /> Reservar mesa
          </Link>
          <Link
            href={STORE_URL}
            className="group inline-flex items-center gap-2 rounded-full bg-[#FEBB1B] px-5 py-2.5 text-xs font-black uppercase tracking-wide text-[#0B0A08] shadow-[0_10px_24px_rgba(254,187,27,0.3)] transition hover:-translate-y-0.5 hover:bg-[#ffc843]"
          >
            <ShoppingBag size={16} />
            Pedir online
          </Link>
        </div>

        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white lg:hidden"
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#0B0A08] px-5 py-4 lg:hidden">
          <div className="grid gap-1 text-sm font-bold text-white">
            {resolvedNavLinks.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 uppercase tracking-wide hover:bg-white/[0.06]"
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-3 text-xs font-bold uppercase tracking-wide text-white/50"
            >
              <LogIn size={16} /> Iniciar sesión
            </Link>
            <Link
              href={reservasHref}
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-3 text-xs font-bold uppercase tracking-wide text-white"
            >
              <CalendarCheck2 size={16} className="text-[#FEBB1B]" /> Reservar mesa
            </Link>
            <Link
              href={STORE_URL}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-[#FEBB1B] px-4 py-3 text-xs font-black uppercase tracking-wide text-[#0B0A08]"
            >
              <ShoppingBag size={16} /> Pedir online
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
