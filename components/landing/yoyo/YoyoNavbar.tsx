"use client";

import Image from "next/image";
import Link from "next/link";
import { LogIn, Menu, MessageCircle, Store, X } from "lucide-react";
import { useState } from "react";
import { STORE_URL, WHATSAPP_URL } from "./constants";

const links = [
  ["Servicios", "#servicios"],
  ["Cotizar", "#cotizar"],
  ["Rastreo", "#rastreo"],
  ["Recogida", "#recogida"],
] as const;

export default function YoyoNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#061a3a]/90 text-white shadow-lg backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-12 w-14 overflow-hidden rounded-xl bg-white shadow-sm">
            <Image src="/yoyo/v13/logo.webp" alt="YOYO Envíos" fill priority className="object-cover object-top" />
          </div>
          <div>
            <p className="text-lg font-black tracking-tight">YOYO ENVÍOS</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">Llevamos tus sueños a Cuba</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-bold lg:flex">
          {links.map(([label, href]) => <a key={href} href={href} className="transition hover:text-red-300">{label}</a>)}
          <Link href={STORE_URL} className="transition hover:text-red-300">Tienda</Link>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-black transition hover:bg-white/20"><LogIn size={17}/> Iniciar sesión</Link>
          <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black shadow-lg transition hover:bg-emerald-400"><MessageCircle size={17}/> WhatsApp</a>
          <Link href={STORE_URL} className="inline-flex items-center gap-2 rounded-xl bg-[#d71920] px-4 py-2.5 text-sm font-black transition hover:bg-red-500"><Store size={17}/> Ver tienda</Link>
        </div>

        <button type="button" aria-label="Abrir menú" onClick={() => setOpen(v => !v)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 lg:hidden">{open ? <X/> : <Menu/>}</button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-[#04142e] px-4 py-4 lg:hidden">
          <div className="grid gap-2 text-sm font-bold">
            {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-4 py-3 hover:bg-white/10">{label}</a>)}
            <Link href="/login" className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center">Iniciar sesión</Link>
            <Link href={STORE_URL} className="rounded-xl bg-[#d71920] px-4 py-3 text-center">Entrar a la tienda</Link>
          </div>
        </div>
      )}
    </header>
  );
}
