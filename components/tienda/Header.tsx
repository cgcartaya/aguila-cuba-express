"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  Home,
  ShoppingBag,
  Star,
  Gift,
  PackageSearch,
  CalendarDays,
  MessageCircle,
  ShoppingCart,
  Lock,
  Search,
  XCircle,
} from "lucide-react";

import { useStore } from "@/hooks/useStore";
import { useTiendaSearch } from "@/components/tienda/search/TiendaSearchContext";

type HeaderProps = {
  cartCount: number;
};

export default function Header({ cartCount }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const { store } = useStore();
  const { search, setSearch, clearSearch } = useTiendaSearch();

  const primaryColor = store?.primary_color || "#061b3a";
  const secondaryColor = store?.secondary_color || "#ef233c";
  const storeName = store?.name || "Águila Cuba Express";
  const isDefaultStore = store?.slug === "aguila";

  const storeBaseUrl =
    store?.slug && !isDefaultStore ? `/tienda/${store.slug}` : "/tienda";

  const cartUrl =
    store?.slug && !isDefaultStore
      ? `/tienda/${store.slug}/cart`
      : "/tienda/cart";

  const menuItems = useMemo(
    () => [
      { label: "Inicio", href: "/", icon: Home },
      { label: "Tienda", href: storeBaseUrl, icon: ShoppingBag },
      {
        label: "Productos destacados",
        href: `${storeBaseUrl}/productos-destacados`,
        icon: Star,
      },
      { label: "Combos", href: `${storeBaseUrl}/combos`, icon: Gift },
      { label: "Rastrear paquete", href: "/rastrear", icon: PackageSearch },
      { label: "Salidas", href: "/salidas", icon: CalendarDays },
    ],
    [storeBaseUrl]
  );

  return (
    <>
      <header
        className="sticky top-0 z-50 w-full max-w-full overflow-hidden shadow-[0_8px_22px_rgba(15,23,42,0.14)]"
        style={{
          background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
        }}
      >
        <div
          className="
            mx-auto grid h-[58px] w-full max-w-7xl grid-cols-[42px_minmax(0,1fr)_42px]
            items-center gap-2 overflow-hidden px-3
            sm:h-[64px] sm:grid-cols-[46px_minmax(0,1fr)_46px] sm:gap-3 sm:px-4
          "
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm backdrop-blur transition active:scale-95 sm:h-[46px] sm:w-[46px]"
          >
            <Menu size={27} strokeWidth={2.8} />
          </button>

          <label
            className="
              flex h-[42px] min-w-0 items-center overflow-hidden rounded-[17px]
              bg-white/96 px-3 shadow-sm ring-1 ring-white/40 transition
              focus-within:bg-white focus-within:ring-2 focus-within:ring-white/80
              sm:h-[46px] sm:px-4
            "
          >
            <Search size={20} className="mr-2 shrink-0 text-slate-400" />

            <input
              type="search"
              inputMode="search"
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar productos..."
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-bold text-slate-800 outline-none placeholder:font-semibold placeholder:text-slate-400 sm:text-base"
            />

            {search.trim().length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Limpiar búsqueda"
                className="ml-1 shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <XCircle size={18} />
              </button>
            )}
          </label>

          <Link
            href={cartUrl}
            aria-label="Carrito"
            className="relative flex h-[42px] w-[42px] items-center justify-center rounded-2xl bg-white text-[#061b3a] shadow-sm transition active:scale-95 sm:h-[46px] sm:w-[46px]"
          >
            <ShoppingCart size={27} />

            <span className="absolute right-0 top-0 flex h-5 min-w-5 translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-black leading-none text-white shadow">
              {cartCount}
            </span>
          </Link>
        </div>
      </header>

      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[60] bg-black/40"
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[70] h-full w-[82%] max-w-[330px] bg-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: `${primaryColor}22` }}
        >
          <div>
            <h2 className="text-lg font-black" style={{ color: primaryColor }}>
              {storeName}
            </h2>

            <p className="text-xs font-bold text-slate-500">
              Menú de la tienda
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full bg-slate-100 p-2"
            style={{ color: primaryColor }}
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
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-black transition hover:bg-slate-100"
                style={{ color: primaryColor }}
              >
                <Icon size={21} />
                {item.label}
              </Link>
            );
          })}

          <div className="my-4 border-t pt-4">
            <p className="mb-2 px-4 text-xs font-black uppercase tracking-wider text-slate-400">
              Administración
            </p>

            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black transition hover:bg-slate-100"
              style={{ color: primaryColor }}
            >
              <Lock size={21} />
              Administrar tienda
            </Link>
          </div>

          <a
            href="https://wa.me/13054974891?text=Hola,%20necesito%20ayuda%20con%20un%20pedido."
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
