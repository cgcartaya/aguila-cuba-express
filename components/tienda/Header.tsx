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
  PackageSearch,
  CalendarDays,
  MessageCircle,
  ShoppingCart,
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
    href: "/salidas",
    icon: CalendarDays,
  },
];

export default function Header({ cartCount }: HeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* BOTÓN HAMBURGUESA */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-[#061b3a]"
            aria-label="Abrir menú"
          >
            <Menu size={30} strokeWidth={2.5} />
          </button>

          {/* LOGO */}
          <Link href="/tienda" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Águila Cuba Express"
              width={52}
              height={52}
              className="rounded-full"
            />

            <div className="leading-tight">
              <h1 className="text-lg font-black uppercase text-[#061b3a] md:text-2xl">
                ÁGUILA CUBA EXPRESS
              </h1>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Envíos a Cuba
              </p>
            </div>
          </Link>

          {/* CARRITO */}
          <Link
            href="/tienda/cart"
            className="relative text-[#061b3a]"
            aria-label="Carrito"
          >
            <ShoppingCart size={30} />
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-black text-white">
              {cartCount}
            </span>
          </Link>
        </div>
      </header>

      {/* FONDO OSCURO */}
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] bg-black/40"
          aria-label="Cerrar menú"
        />
      )}

      {/* MENÚ LATERAL */}
      <aside
        className={`fixed left-0 top-0 z-[70] h-full w-[82%] max-w-[330px] bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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