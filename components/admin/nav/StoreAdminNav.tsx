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
  UserRound,
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
    title: "Envíos",
    links: [
      { href: "/admin/shipping", label: "Dashboard de envíos", icon: LayoutDashboard },
      { href: "/admin/shipping/shipments", label: "Lista de envíos", icon: Truck },
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
    links: [{ href: "/admin/settings", label: "Ajustes de tienda", icon: Settings }],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(value: string) {
  const result = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  return result || "AD";
}

export default function StoreAdminNav() {
  const pathname = usePathname();
  const { store: selectedStore } = useStore();
  const { isSuperAdmin, store: accessStore, profile, access } = useAdminAccess();

  const activeStore = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const primaryColor = activeStore?.primary_color || "#0B1F4D";
  const storeName = activeStore?.name || "Tienda activa";

  const safeProfile = profile as
    | { full_name?: string; name?: string; email?: string }
    | null;
  const safeAccess = access as
    | { membership?: { role?: string }; role?: string }
    | null;
  const userName =
    safeProfile?.full_name || safeProfile?.name || safeProfile?.email || "Administrador";
  const role = isSuperAdmin
    ? "SUPER ADMIN"
    : safeAccess?.membership?.role || safeAccess?.role || "ADMIN";

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden h-dvh w-72 overflow-hidden text-white shadow-xl xl:flex xl:flex-col"
      style={{ backgroundColor: primaryColor }}
    >
      <div className="shrink-0 px-5 pb-4 pt-5">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
          <Store size={24} />
        </div>
        <h1 className="line-clamp-2 text-xl font-black text-white">{storeName}</h1>
        <p className="text-sm font-semibold text-white/70">Administración de tienda</p>

        {isSuperAdmin && (
          <Link
            href="/admin/saas"
            className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 font-bold text-white transition hover:bg-white/20"
          >
            <Rocket size={18} />
            Volver al SaaS
          </Link>
        )}

        <Link
          href="/admin/products/new"
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-black shadow-lg transition hover:-translate-y-0.5 hover:opacity-95"
          style={{ color: primaryColor }}
        >
          <Plus size={18} />
          Agregar producto
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.28)_transparent]">
        <nav className="space-y-6">
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
                        active
                          ? "bg-white shadow-lg"
                          : "text-white hover:bg-white/10"
                      }`}
                      style={active ? { color: primaryColor } : undefined}
                    >
                      <Icon size={19} />
                      <span className="min-w-0 flex-1 truncate">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </div>

      <div className="shrink-0 border-t border-white/15 bg-black/10 p-4 backdrop-blur-sm">
        <Link
          href="/portal"
          target="_blank"
          className="mb-3 flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold text-white/90 transition hover:bg-white/10"
        >
          <ExternalLink size={18} />
          Ver experiencia pública
        </Link>

        <div className="rounded-3xl border border-white/15 bg-white/10 p-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white font-black" style={{ color: primaryColor }}>
              {initials(userName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{userName}</p>
              <p className="truncate text-[11px] font-black uppercase tracking-wider text-white/55">
                {role}
              </p>
            </div>
            <UserRound size={18} className="text-white/60" />
          </div>
          <p className="mt-2 truncate text-xs font-semibold text-white/65">{storeName}</p>
        </div>

        <LogoutButton className="mt-3 bg-white text-slate-900 shadow-lg hover:bg-slate-100" />
      </div>
    </aside>
  );
}
