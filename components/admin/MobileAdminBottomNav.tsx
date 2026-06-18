"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  PlusCircle,
  Store,
} from "lucide-react";

export default function MobileAdminBottomNav() {
  const pathname = usePathname();

  const links = [
    {
      name: "Inicio",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      name: "Productos",
      href: "/admin/products",
      icon: Package,
    },
    {
      name: "Nuevo",
      href: "/admin/products/new",
      icon: PlusCircle,
    },
    {
      name: "Órdenes",
      href: "/admin/orders",
      icon: ShoppingCart,
    },
    {
      name: "Tienda",
      href: "/tienda",
      icon: Store,
    },
  ];

  return (
    <nav
      className="
        fixed 
        bottom-0 
        left-0 
        right-0 
        z-50 
        bg-white/95 
        backdrop-blur 
        border-t
        shadow-lg
      "
    >
      <div className="grid grid-cols-5 h-16">
        {links.map((link) => {
          const Icon = link.icon;

          const active = pathname === link.href;

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`
                flex 
                flex-col 
                items-center 
                justify-center 
                gap-1 
                text-xs 
                font-semibold
                transition
                ${
                  active
                    ? "text-[#061b3a]"
                    : "text-gray-500"
                }
              `}
            >
              <Icon
                size={22}
                className={
                  active
                    ? "stroke-[2.5]"
                    : ""
                }
              />

              <span>{link.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}