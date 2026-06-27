"use client";

/* =========================================================
   HEADER - TIENDA PÚBLICA
   Incluye menú hamburguesa lateral y contador del carrito
========================================================= */

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Menu,
  X,
  Home,
  ShoppingBag,
  Star,
  Tags,
  Gift,
  PackageSearch,
  CalendarDays,
  MessageCircle,
  ShoppingCart,
  Lock,
} from "lucide-react";

type HeaderProps = {
  cartCount: number;
};

const menuItems = [
  {
    label: "Inicio",
    href: "/",
    icon: Home,
  },
  {
    label: "Tienda",
    href: "/tienda",
    icon: ShoppingBag,
  },
  {
    label: "Productos destacados",
    href: "/tienda/productos-destacados",
    icon: Star,
  },
  {
    label: "Combos",
    href: "/tienda/combos",
    icon: Gift,
  },
  {
    label: "Ofertas",
    href: "/tienda/ofertas",
    icon: Tags,
  },
  {
    label: "Rastrear paquete",
    href: "/rastrear",
    icon: PackageSearch,
  },
  {
    label: "Salidas",
    href: "/tienda/salidas",
    icon: CalendarDays,
  },
];

export default function Header({ cartCount }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
  {/* =========================================================
    HEADER PREMIUM CORPORATIVO
========================================================= */}
<header className="sticky top-0 z-50 overflow-hidden bg-gradient-to-r from-[#061b3a] via-[#0c2d63] to-[#0f6bff] shadow-xl">

  {/* EFECTO DECORATIVO */}
  <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
  <div className="absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

  <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4">

    {/* BOTÓN MENÚ */}
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Abrir menú"
      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
    >
      <Menu size={32} strokeWidth={2.6} />
    </button>

    {/* LOGO + TÍTULOS */}
    <Link
      href="/tienda"
      className="flex flex-1 items-center justify-center gap-3 px-2"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg">
        <Image
          src="/logo.png"
          alt="Águila Cuba Express"
          width={48}
          height={48}
          className="rounded-full"
        />
      </div>

      <div className="leading-tight">
        <h1 className="text-lg font-black uppercase tracking-wide text-white md:text-2xl">
          ÁGUILA CUBA EXPRESS
        </h1>

        <p className="text-xs font-bold uppercase tracking-wider text-blue-100 md:text-sm">
          ENVÍOS A CUBA
        </p>

        <p className="hidden text-[11px] font-semibold text-blue-200 sm:block">
          ✈️ Entregas rápidas a Cienfuegos
        </p>
      </div>
    </Link>

    {/* CARRITO */}
    <Link
      href="/tienda/cart"
      aria-label="Carrito"
      className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg transition hover:scale-105"
    >
      <ShoppingCart
        size={30}
        className="text-[#061b3a]"
      />

      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white shadow-lg">
        {cartCount}
      </span>
    </Link>

  </div>
</header>

      {/* OVERLAY OSCURO */}
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] bg-black/40"
          aria-label="Cerrar menú"
        />
      )}

      {/* =========================================================
          MENÚ LATERAL
      ========================================================= */}
      <aside
        className={`fixed left-0 top-0 z-[70] h-full w-[82%] max-w-[330px] bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* CABECERA MENÚ */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-[#061b3a]">
              Águila Cuba Express
            </h2>

            <p className="text-xs font-bold text-slate-500">
              Menú de la tienda
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full bg-slate-100 p-2 text-[#061b3a]"
            aria-label="Cerrar menú"
          >
            <X size={22} />
          </button>
        </div>

        {/* OPCIONES DEL MENÚ */}
        <nav className="space-y-2 px-4 py-5">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-[#061b3a] transition hover:bg-slate-100"
              >
                <Icon size={21} />
                {item.label}
              </Link>
            );
          })}

          {/* =========================================================
              SECCIÓN ADMINISTRACIÓN
          ========================================================= */}
          <div className="my-4 border-t pt-4">
            <p className="mb-2 px-4 text-xs font-black uppercase tracking-wider text-slate-400">
              Administración
            </p>

            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-[#061b3a] transition hover:bg-slate-100"
            >
              <Lock size={21} />
              Administrar tienda
            </Link>
          </div>

          {/* =========================================================
              WHATSAPP AYUDA
          ========================================================= */}
          <a
            href="https://wa.me/13054974891?text=Hola,%20necesito%20ayuda%20con%20un%20pedido%20de%20Águila%20Cuba%20Express."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black text-green-600 transition hover:bg-green-50"
          >
            <MessageCircle size={21} />
            Ayuda por WhatsApp
          </a>
        </nav>
      </aside>
    </>
  );
}