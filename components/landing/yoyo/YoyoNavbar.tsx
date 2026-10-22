"use client";

import Image from "next/image";
import Link from "next/link";
import { LogIn, Menu, MessageCircle, Store, X } from "lucide-react";
import { useState } from "react";
import { STORE_URL, WHATSAPP_URL } from "./constants";

const links = [
  ["Cotizar", "#cotizar"],
  ["Recogida", "#recogida"],
] as const;

export default function YoyoNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 text-[#071b3d] shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-12 w-14 overflow-hidden rounded-xl bg-white shadow-sm">
            <Image src="/yoyo/v13/logo.webp" alt="YOYO Envíos" fill priority className="object-cover object-top" />
          </div>
          <div>
            <p className="text-lg font-black tracking-tight">YOYO ENVÍOS</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0757bb]">Llevamos tus sueños a Cuba</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-bold xl:flex">
          {links.map(([label, href]) => <a key={href} href={href} className="transition hover:text-red-600">{label}</a>)}
          <Link href={STORE_URL} className="transition hover:text-red-600">Tienda</Link>
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black transition hover:bg-blue-50"><LogIn size={17}/> Iniciar sesión</Link>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 px-4 py-2.5 text-sm font-black transition hover:bg-emerald-100"><MessageCircle size={17}/> WhatsApp</a>
          <Link href={STORE_URL} className="inline-flex items-center gap-2 rounded-xl bg-[#ed1438] text-white px-4 py-2.5 text-sm font-black transition hover:bg-red-500"><Store size={17}/> Ver tienda</Link>
        </div>

        <button type="button" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} aria-controls="yoyo-mobile-menu" onClick={() => setOpen(v => !v)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 xl:hidden">{open ? <X/> : <Menu/>}</button>
      </div>
      {open && (
        <div id="yoyo-mobile-menu" className="border-t border-slate-200 bg-white px-4 py-4 xl:hidden">
          <div className="grid gap-2 text-sm font-bold">
            {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 hover:bg-blue-50">{label}</a>)}
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-emerald-700">WhatsApp</a>
            <Link href="/login" className="rounded-xl border border-slate-200 bg-blue-50 px-4 py-3 text-center">Iniciar sesión</Link>
            <Link href={STORE_URL} className="rounded-xl bg-[#ed1438] text-white px-4 py-3 text-center">Entrar a la tienda</Link>
          </div>
        </div>
      )}
    </header>
  );
}
