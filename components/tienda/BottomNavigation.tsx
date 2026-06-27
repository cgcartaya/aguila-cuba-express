"use client";

/* =========================================================
   BOTTOM NAVIGATION - TIENDA PÚBLICA
   Menú inferior estilo app móvil
========================================================= */

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  House,
  Package,
  ShoppingBag,
  CalendarDays,
  MessageCircle,
} from "lucide-react";

export default function BottomNavigation() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/tienda") {
      return pathname === "/tienda" || pathname.startsWith("/tienda/");
    }

    return pathname.startsWith(href);
  };

  const itemClass = (active: boolean) =>
    `flex flex-col items-center gap-1 transition ${
      active ? "text-red-600" : "text-slate-500"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white px-4 py-2 shadow-lg md:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-5 text-center text-xs font-bold">
        {/* =========================================================
            INICIO
        ========================================================= */}
        <Link href="/" className={itemClass(pathname === "/")}>
          <House size={21} />
          <span>Inicio</span>
        </Link>

        {/* =========================================================
            RASTREAR
        ========================================================= */}
        <Link
          href="/rastrear"
          className={itemClass(pathname.startsWith("/rastrear"))}
        >
          <Package size={21} />
          <span>Rastrear</span>
        </Link>

        {/* =========================================================
            TIENDA
        ========================================================= */}
        <Link href="/tienda" className={itemClass(isActive("/tienda"))}>
          <ShoppingBag size={21} />
          <span>Tienda</span>
        </Link>

        {/* =========================================================
            SALIDAS
        ========================================================= */}
        <Link
          href="/tienda/salidas"
          className={itemClass(
            pathname.startsWith("/tienda/salidas")
          )}
        >
          <CalendarDays size={21} />
          <span>Salidas</span>
        </Link>

        {/* =========================================================
            AYUDA (WHATSAPP)
        ========================================================= */}
        <a
          href="https://wa.me/13054974891"
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 text-green-600 transition"
        >
          <MessageCircle size={21} />
          <span>Ayuda</span>
        </a>
      </div>
    </nav>
  );
}