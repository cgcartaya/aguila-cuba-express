"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Tags,
  Layers3,
  ExternalLink,
} from "lucide-react";

import LogoutButton from "@/components/admin/LogoutButton";
import { useStore } from "@/hooks/useStore";

type AdminLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

/* =========================================================
   ADMINISTRACIÓN SAAS
   - Aquí van las pantallas del dueño de la plataforma.
   - No deben depender de una tienda activa.
========================================================= */

const saasLinks: AdminLink[] = [
  {
    href: "/admin/saas",
    label: "Dashboard SaaS",
    icon: Rocket,
  },
  {
    href: "/admin/stores",
    label: "Tiendas",
    icon: Building2,
  },
];

/* =========================================================
   ADMINISTRACIÓN DE TIENDA
   - Aquí van las pantallas que trabajan con la tienda activa.
   - Productos, categorías, combos, inventario y órdenes deben
     seguir filtrándose por store_id desde sus páginas/servicios.
========================================================= */

const storeLinks: AdminLink[] = [
  {
    href: "/admin",
    label: "Dashboard tienda",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/products",
    label: "Productos",
    icon: Package,
  },
  {
    href: "/admin/categories",
    label: "Categorías",
    icon: Tags,
  },
  {
    href: "/admin/combos",
    label: "Combos",
    icon: Layers3,
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
  {
    href: "/admin/settings",
    label: "Ajustes tienda",
    icon: Settings,
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavSection({
  title,
  links,
  primaryColor,
}: {
  title: string;
  links: AdminLink[];
  primaryColor: string;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-2">
      <p className="px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/50">
        {title}
      </p>

      {links.map((link) => {
        const Icon = link.icon;
        const active = isActivePath(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition ${
              active ? "bg-white shadow-lg" : "text-white hover:bg-white/10"
            }`}
            style={active ? { color: primaryColor } : {}}
          >
            <Icon size={20} />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

export default function AdminNav() {
  const { store } = useStore();

  const primaryColor = store?.primary_color || "#0B1F4D";
  const storeName = store?.name || "Tienda activa";

  return (
    <aside
      className="hidden min-h-screen w-72 p-5 text-white shadow-xl xl:block"
      style={{ backgroundColor: primaryColor }}
    >
      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div className="mb-6">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <Store size={24} />
        </div>

        <h1 className="line-clamp-2 text-xl font-black text-white">
          {storeName}
        </h1>

        <p className="text-sm font-semibold text-white/70">
          Administración de tienda
        </p>
      </div>

      {/* =====================================================
          ACCIÓN PRINCIPAL DE TIENDA
      ===================================================== */}

      <Link
        href="/admin/products/new"
        className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-lg transition hover:opacity-90"
        style={{ color: primaryColor }}
      >
        <Plus size={18} />
        Agregar producto
      </Link>

      {/* =====================================================
          MENÚ SEPARADO
      ===================================================== */}

      <nav className="space-y-7">
        <NavSection
          title="Plataforma SaaS"
          links={saasLinks}
          primaryColor={primaryColor}
        />

        <div className="border-t border-white/15 pt-6">
          <NavSection
            title="Tienda activa"
            links={storeLinks}
            primaryColor={primaryColor}
          />
        </div>
      </nav>

      {/* =====================================================
          ACCIONES INFERIORES
      ===================================================== */}

      <div className="mt-8 border-t border-white/20 pt-5">
        <Link
          href="/tienda"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-white transition hover:bg-white/10"
        >
          <ExternalLink size={20} />
          Ver tienda pública
        </Link>
      </div>

      <div className="mt-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
