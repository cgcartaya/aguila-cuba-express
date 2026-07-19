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
  Tags,
  Layers3,
  ExternalLink,
  Rocket,
  BarChart3,
  Truck,
  Wrench,
  Calculator,
  ClipboardCheck,
} from "lucide-react";

import LogoutButton from "@/components/admin/LogoutButton";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type AdminLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const storeLinks: AdminLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Productos", icon: Package },
  { href: "/admin/combos", label: "Combos", icon: Layers3 },
  { href: "/admin/inventory", label: "Inventario", icon: Boxes },
  { href: "/admin/orders", label: "Órdenes", icon: ShoppingCart },
  { href: "/admin/shipping", label: "Dashboard de envíos", icon: LayoutDashboard },
  { href: "/admin/shipping/shipments", label: "Lista de envíos", icon: Truck },
  { href: "/admin/shipping/settings", label: "Ajustes de envíos", icon: Wrench },
  { href: "/admin/portal/cotizador", label: "Cotizador público", icon: Calculator },
  { href: "/admin/portal/cotizaciones", label: "Cotizaciones", icon: ClipboardCheck },
  { href: "/admin/customers", label: "Clientes", icon: Users },
  { href: "/admin/analytics", label: "Visitas", icon: BarChart3 },
  { href: "/admin/settings", label: "Ajustes tienda", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StoreAdminNav() {
  const pathname = usePathname();
  const { store: selectedStore } = useStore();

const {
  isSuperAdmin,
  store: accessStore,
} = useAdminAccess();

const activeStore = isSuperAdmin
  ? (selectedStore || accessStore)
  : accessStore;

const primaryColor = activeStore?.primary_color || "#0B1F4D";
const storeName = activeStore?.name || "Tienda activa";

  return (
    <aside
      className="hidden min-h-screen w-72 p-5 text-white shadow-xl xl:block"
      style={{ backgroundColor: primaryColor }}
    >
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

      {isSuperAdmin && (
        <Link
          href="/admin/saas"
          className="mb-4 flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-white/20"
        >
          <Rocket size={18} />
          Volver al SaaS
        </Link>
      )}

      <Link
        href="/admin/products/new"
        className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-lg transition hover:opacity-90"
        style={{ color: primaryColor }}
      >
        <Plus size={18} />
        Agregar producto
      </Link>

      <nav className="space-y-2">
        {storeLinks.map((link) => {
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
      </nav>

      <div className="mt-8 border-t border-white/20 pt-5">
        <Link
          href={
  activeStore?.slug && activeStore.slug !== "aguila"
    ? `/tienda/${activeStore.slug}`
    : "/tienda"
}
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
