"use client";

import Link from "next/link";
import { getVisibleAdminSections } from "@/lib/admin/nav-config";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Boxes,
} from "lucide-react";

const links = [
  { name: "Inicio", href: "/admin", icon: LayoutDashboard },
  { name: "Productos", href: "/admin/products", icon: Package },
  { name: "Inventario", href: "/admin/inventory", icon: Boxes },
  { name: "Órdenes", href: "/admin/orders", icon: ShoppingCart },
  { name: "Envíos", href: "/admin/shipping", icon: Truck },
];

function isSaasArea(pathname: string) {
  return pathname === "/admin/saas" || pathname.startsWith("/admin/saas/") || pathname === "/admin/stores" || pathname.startsWith("/admin/stores/");
}

export default function MobileAdminBottomNav() {
  const pathname = usePathname();
  const { access, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const activeStore = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const sections = getVisibleAdminSections(activeStore, isSuperAdmin, access?.storeMembership || null);
  const paths = new Set(sections.flatMap(section => section.links.map(link => link.href)));
  const visibleLinks = links.map(link => link.href === "/admin/shipping" && !paths.has(link.href) && paths.has("/admin/shipping/shipments") ? { ...link, href: "/admin/shipping/shipments" } : link).filter(link => paths.has(link.href));

  // En las pantallas SaaS usamos el menú lateral/hamburguesa,
  // no el bottom nav operativo de la tienda.
  if (isSaasArea(pathname) || !visibleLinks.length) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
      <div className="grid h-20 items-center px-2" style={{ gridTemplateColumns: `repeat(${visibleLinks.length}, minmax(0, 1fr))` }}>
        {visibleLinks.map((link) => {
          const Icon = link.icon;
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

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
