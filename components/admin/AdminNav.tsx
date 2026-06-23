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
} from "lucide-react";

const links = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/products",
    label: "Productos",
    icon: Package,
  },
  {
    href: "/admin/orders",
    label: "Órdenes",
    icon: ShoppingCart,
  },
  {
  href: "/admin/customers",
  label: "Clientes",
  icon: Users,
},
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 border-r bg-white p-5 lg:block">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Águila Admin</h1>
        <p className="text-sm text-gray-500">Panel de control</p>
      </div>

      <Link
        href="/admin/products/new"
        className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 font-bold text-white"
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
                  ? "bg-black text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon size={20} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t pt-5">
        <Link
          href="/tienda"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-gray-700 hover:bg-gray-100"
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