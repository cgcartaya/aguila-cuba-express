"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Plus, ShoppingCart, Store } from "lucide-react";

const navItems = [
  {
    label: "Inicio",
    href: "/admin",
    icon: Home,
  },
  {
    label: "Productos",
    href: "/admin/products",
    icon: Package,
  },
  {
    label: "Nuevo",
    href: "/admin/products/new",
    icon: Plus,
    center: true,
  },
  {
    label: "Órdenes",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    label: "Tienda",
    href: "/tienda",
    icon: Store,
  },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-blue-100 bg-white/95 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          if (item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -mt-8 flex flex-col items-center gap-1 text-xs font-semibold text-[#0B1F4D]"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl shadow-red-900/25 transition hover:scale-105">
                  <Icon size={34} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold transition ${
                isActive
                  ? "text-[#0B1F4D]"
                  : "text-slate-500 hover:text-blue-700"
              }`}
            >
              <Icon size={26} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}