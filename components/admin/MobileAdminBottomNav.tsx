"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Boxes,
} from "lucide-react";

export default function MobileAdminBottomNav() {
  const pathname = usePathname();

  const links = [
    { name: "Inicio", href: "/admin", icon: LayoutDashboard },
    { name: "Productos", href: "/admin/products", icon: Package },
    { name: "Inventario", href: "/admin/inventory", icon: Boxes },
    { name: "Órdenes", href: "/admin/orders", icon: ShoppingCart },
    { name: "Tienda", href: "/tienda", icon: Store },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
      <div className="grid h-20 grid-cols-5 items-center px-2">
        {links.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);

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