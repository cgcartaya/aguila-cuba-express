"use client";

import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";
import { usePathname } from "next/navigation";
import { useStore } from "@/hooks/useStore";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Store,
  Plus,
  Users,
  Settings,
  Boxes,
  Building2,
  Rocket,
} from "lucide-react";

/* =========================================================
   ENLACES DEL PANEL ADMINISTRATIVO
========================================================= */

const links = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  },

  {
  href: "/admin/saas",
  label: "SaaS",
  icon: Rocket,
},

  {
    href: "/admin/products",
    label: "Productos",
    icon: Package,
  },

  {
    href: "/admin/inventory",
    label: "Inventario",
    icon: Boxes,
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

  /* =========================================================
     SaaS Multiempresa
  ========================================================= */

  {
    href: "/admin/stores",
    label: "Tiendas",
    icon: Building2,
  },

  {
    href: "/admin/settings",
    label: "Ajustes",
    icon: Settings,
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  /* =========================================================
     STORE BRANDING
  ========================================================= */

  const { store } = useStore();

  const primaryColor = store?.primary_color || "#0B1F4D";

  const storeName = store?.name || "Águila";

  return (
    <aside
      className="hidden min-h-screen w-72 p-5 text-white shadow-xl xl:block"
      style={{
        backgroundColor: primaryColor,
      }}
    >
      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">
          {storeName} Admin
        </h1>

        <p className="text-sm text-white/70">
          Panel de control
        </p>
      </div>

      {/* =====================================================
          BOTÓN AGREGAR PRODUCTO
      ===================================================== */}

      <Link
        href="/admin/products/new"
        className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-lg transition hover:opacity-90"
        style={{
          color: primaryColor,
        }}
      >
        <Plus size={18} />
        Agregar producto
      </Link>

      {/* =====================================================
          MENÚ PRINCIPAL
      ===================================================== */}

      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;

          const active =
            pathname === link.href ||
            (link.href !== "/admin" &&
              pathname.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition ${
                active
                  ? "bg-white shadow-lg"
                  : "text-white hover:bg-white/10"
              }`}
              style={
                active
                  ? {
                      color: primaryColor,
                    }
                  : {}
              }
            >
              <Icon size={20} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* =====================================================
          ACCIONES INFERIORES
      ===================================================== */}

      <div className="mt-8 border-t border-white/20 pt-5">
        <Link
          href="/tienda"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-white transition hover:bg-white/10"
        >
          <Store size={20} />
          Ver tienda
        </Link>
      </div>

      {/* =====================================================
          CERRAR SESIÓN
      ===================================================== */}

      <div className="mt-4">
        <LogoutButton />
      </div>
    </aside>
  );
}