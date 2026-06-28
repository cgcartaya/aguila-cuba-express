"use client";

import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Plus,
  Users,
  Settings,
} from "lucide-react";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/orders", label: "Órdenes", icon: ShoppingCart },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/settings", label: "Ajustes", icon: Settings },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 bg-[#0B1F4D] p-5 text-white shadow-xl lg:block">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">Águila Admin</h1>
        <p className="text-sm text-blue-200">Panel de control</p>
      </div>

      <Link
        href="/admin/products/new"
        className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 font-bold text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700"
      >
        <Plus size={18} />
        Agregar producto
      </Link>

      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;

          const active =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition ${
                active
                  ? "bg-white text-[#0B1F4D] shadow-lg"
                  : "text-blue-100 hover:bg-white/10"
              }`}
            >
              <Icon size={20} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t border-white/15 pt-5">
        <Link
          href="/tienda"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-blue-100 transition hover:bg-white/10"
        >
          <Store size={20} />
          Ver tienda
        </Link>
      </div>

      <div className="mt-4">
        <LogoutButton />
      </div>
    </aside>
  );
}