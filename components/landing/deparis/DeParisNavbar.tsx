"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, MessageCircle, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";

import { NAV_LINKS, STORE_URL, WHATSAPP_URL } from "./constants";

export default function DeParisNavbar({ menuHref }: { menuHref?: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // El link "Menú" del nav original apuntaba a la sección vitrina
  // "#menu" dentro de la misma landing. Si el módulo de menú digital
  // está activo para esta tienda, ese mismo link ahora lleva directo
  // a /menu/deparis para pedir de verdad; si no, se queda igual que
  // siempre (solo vitrina).
  const resolvedNavLinks = NAV_LINKS.map(([label, href]) =>
    label === "Menú" && menuHref ? ([label, menuHref] as const) : ([label, href] as const)
  );

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#FFF4D6]/90 shadow-[0_10px_30px_rgba(27,20,16,0.08)] backdrop-blur-xl"
          : "bg-[#FFF4D6]/40 backdrop-blur-md"
      }`}
    >
      <div className="h-[2px] w-full bg-gradient-to-r from-[#FC6C26] via-[#C89B3C] to-[#FC6C26]" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="#inicio" className="flex items-center gap-3">
          <div className="relative h-12 w-16 shrink-0">
            <Image
              src="/deparis/logo.png"
              alt="De Paris — Mercado"
              fill
              priority
              className="object-contain object-left"
            />
          </div>
          <div className="hidden leading-none sm:block">
            <p
              className="text-lg font-bold tracking-tight text-[#1B1410]"
              style={{ fontFamily: "var(--font-dp-display)" }}
            >
              De&apos; Paris
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#FC6C26]">
              Mercado &amp; Bistró
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#1B1410]/80 lg:flex">
          {resolvedNavLinks.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="relative py-1 transition hover:text-[#FC6C26] [&:hover::after]:w-full after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#FC6C26] after:transition-all after:duration-300"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[#1B1410]/15 bg-white/60 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[#1B1410] transition hover:-translate-y-0.5 hover:border-[#FC6C26]/40 hover:bg-white"
          >
            <MessageCircle size={16} className="text-[#FC6C26]" /> Reservar
          </a>
          <Link
            href={STORE_URL}
            className="group inline-flex items-center gap-2 rounded-full bg-[#FC6C26] px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-[#FFF4D6] shadow-[0_10px_24px_rgba(252,108,38,0.35)] transition hover:-translate-y-0.5 hover:bg-[#e85d1a]"
          >
            <ShoppingBag size={16} />
            Ver Mercado
          </Link>
        </div>

        <button
          type="button"
          aria-label="Abrir menú"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1B1410]/15 bg-white/60 text-[#1B1410] lg:hidden"
        >
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#1B1410]/10 bg-[#FFF4D6] px-5 py-4 lg:hidden">
          <div className="grid gap-1 text-sm font-semibold text-[#1B1410]">
            {resolvedNavLinks.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 uppercase tracking-wide hover:bg-white/60"
              >
                {label}
              </Link>
            ))}
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center gap-2 rounded-full border border-[#1B1410]/15 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wide"
            >
              <MessageCircle size={16} className="text-[#FC6C26]" /> Reservar por WhatsApp
            </a>
            <Link
              href={STORE_URL}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-[#FC6C26] px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#FFF4D6]"
            >
              <ShoppingBag size={16} /> Ver Mercado
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
