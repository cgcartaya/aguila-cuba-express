"use client";

/* =========================================================
   ADMIN MOBILE MENU

   Drawer lateral para el panel administrativo.
   Se usa en móvil para no saturar el Bottom Navigation.

   Incluye accesos a:
   - Dashboard
   - Productos
   - Categorías
   - Combos
   - Órdenes
   - Tienda pública
========================================================= */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  ClipboardList,
  Store,
  Settings,
  Users,
} from "lucide-react";

type AdminMobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

const adminLinks = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Productos",
    href: "/admin/products",
    icon: Package,
  },
  {
    label: "Categorías",
    href: "/admin/categories",
    icon: Tags,
  },
  {
    label: "Combos",
    href: "/admin/combos",
    icon: Boxes,
  },
  {
    label: "Órdenes",
    href: "/admin/orders",
    icon: ClipboardList,
  },
  {
  label: "Clientes",
  href: "/admin/customers",
  icon: Users,
},
  {
    label: "Configuración",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    label: "Ver tienda pública",
    href: "/tienda",
    icon: Store,
  },
];

export default function AdminMobileMenu({
  open,
  onClose,
}: AdminMobileMenuProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      {/* Fondo oscuro */}
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      {/* Drawer */}
      <aside className="relative h-full w-[82%] max-w-sm bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="text-xl font-black text-[#061b3a]">
              Admin
            </h2>
            <p className="text-sm font-bold text-slate-500">
              Águila Cuba Express
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-[#061b3a]"
          >
            <X size={24} />
          </button>
        </div>

        {/* Links */}
        <nav className="grid gap-2 px-4 py-5">
          {adminLinks.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" &&
                pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-4 rounded-2xl px-4 py-4 text-base font-black transition ${
                  isActive
                    ? "bg-red-50 text-red-600"
                    : "text-[#061b3a] hover:bg-slate-50"
                }`}
              >
                <Icon size={24} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}