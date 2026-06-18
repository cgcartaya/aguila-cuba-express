"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Plus,
  Store,
} from "lucide-react";

export default function MobileAdminBottomNav() {
  const pathname = usePathname();

  const links = [
    {
      name: "Inicio",
      href: "/admin",
      icon: LayoutDashboard,
      type: "normal",
    },
    {
      name: "Productos",
      href: "/admin/products",
      icon: Package,
      type: "normal",
    },
    {
      name: "Nuevo",
      href: "/admin/products/new",
      icon: Plus,
      type: "main",
    },
    {
      name: "Órdenes",
      href: "/admin/orders",
      icon: ShoppingCart,
      type: "normal",
    },
    {
      name: "Tienda",
      href: "/tienda",
      icon: Store,
      type: "normal",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="grid h-20 grid-cols-5 items-center px-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;

          if (link.type === "main") {
            return (
              <Link
                key={link.name}
                href={link.href}
                className="flex flex-col items-center justify-center gap-1 text-xs font-bold text-[#061b3a]"
              >
                <div className="mb-1 flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-black text-white shadow-xl">
                  <Icon size={28} />
                </div>

                <span className="-mt-4">{link.name}</span>
              </Link>
            );
          }

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-1 text-xs font-bold transition ${
                active ? "text-[#061b3a]" : "text-gray-500"
              }`}
            >
              <Icon size={23} className={active ? "stroke-[2.6]" : ""} />
              <span>{link.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}