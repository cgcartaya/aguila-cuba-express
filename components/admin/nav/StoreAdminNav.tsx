"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Calculator,
  ClipboardCheck,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Layers3,
  Package,
  Plus,
  Rocket,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  CalendarDays,
  Route,
  Users,
  Wrench,
} from "lucide-react";

import LogoutButton from "@/components/admin/LogoutButton";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type AdminLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

type AdminSection = {
  title: string;
  links: AdminLink[];
};

const sections: AdminSection[] = [
  {
    title: "Operación",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Órdenes", icon: ShoppingCart },
      { href: "/admin/customers", label: "Clientes", icon: Users },
      { href: "/admin/analytics", label: "Visitas", icon: BarChart3 },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { href: "/admin/products", label: "Productos", icon: Package },
      { href: "/admin/combos", label: "Combos", icon: Layers3 },
      { href: "/admin/inventory", label: "Inventario", icon: Boxes },
    ],
  },
  {
    title: "Recogidas",
    links: [
      { href: "/admin/pickups", label: "Solicitudes de recogida", icon: CalendarDays },
    ],
  },
  {
    title: "Envíos",
    links: [
      { href: "/admin/shipping", label: "Dashboard de envíos", icon: LayoutDashboard },
      { href: "/admin/shipping/trips", label: "Viajes", icon: Route },
      { href: "/admin/shipping/shipments", label: "Todos los envíos", icon: Truck },
      { href: "/admin/shipping/settings", label: "Ajustes de envíos", icon: Wrench },
    ],
  },
  {
    title: "Portal comercial",
    links: [
      { href: "/admin/portal-comercial", label: "Configuración general", icon: Globe2 },
      { href: "/admin/portal/cotizador", label: "Cotizador público", icon: Calculator },
      { href: "/admin/portal/cotizaciones", label: "Cotizaciones", icon: ClipboardCheck },
    ],
  },
  {
    title: "Configuración",
    links: [
      { href: "/admin/settings", label: "Ajustes de tienda", icon: Settings },
    ],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StoreAdminNav() {
  const pathname = usePathname();
  const { store: selectedStore } = useStore();
  const { isSuperAdmin, store: accessStore } = useAdminAccess();

  const activeStore = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const primaryColor = activeStore?.primary_color || "#0B1F4D";
  const storeName = activeStore?.name || "Tienda activa";

  const publicStoreHref = "/portal";

  return (
    <aside
      className="
        fixed
        inset-y-0
        left-0
        z-40
        hidden
        h-screen
        w-72
        overflow-hidden
        p-5
        text-white
        shadow-xl
        xl:flex
        xl:flex-col
      "
      style={{ backgroundColor: primaryColor }}
    >
      <div className="mb-6 shrink-0">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <Store size={24} />
        </div>
        <h1 className="line-clamp-2 text-xl font-black text-white">{storeName}</h1>
        <p className="text-sm font-semibold text-white/70">Administración de tienda</p>
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
        className="mb-7 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-lg transition hover:opacity-90"
        style={{ color: primaryColor }}
      >
        <Plus size={18} />
        Agregar producto
      </Link>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-2 pb-4 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.28)_transparent]">
        {sections.map((section) => (
          <section key={section.title}>
            <p className="mb-2 px-4 text-[11px] font-black uppercase tracking-[0.18em] text-white/50">
              {section.title}
            </p>
            <div className="space-y-1.5">
              {section.links.map((link) => {
                const Icon = link.icon;
                const active = isActivePath(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      active ? "bg-white shadow-lg" : "text-white hover:bg-white/10"
                    }`}
                    style={active ? { color: primaryColor } : undefined}
                  >
                    <Icon size={19} />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/20 pt-4">
        <Link
          href={publicStoreHref}
          target="_blank"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-white transition hover:bg-white/10"
        >
          <ExternalLink size={20} />
          Ver experiencia pública
        </Link>
      </div>

      <div className="mt-3 shrink-0">
        <LogoutButton />
      </div>
    </aside>
  );
}
