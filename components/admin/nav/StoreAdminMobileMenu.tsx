"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  Settings,
  Users,
  Rocket,
  Building2,
  Layers3,
  ExternalLink,
  BarChart3,
  Truck,
  Wrench,
  Calculator,
  ClipboardCheck,
  Globe2,
  Store,
} from "lucide-react";

import LogoutButton from "@/components/admin/LogoutButton";
import StoreSwitcher from "@/components/admin/StoreSwitcher";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type AdminMobileMenuProps = { open: boolean; onClose: () => void };
type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const saasLinks: MenuItem[] = [
  { label: "Dashboard SaaS", href: "/admin/saas", icon: Rocket },
  { label: "Tiendas", href: "/admin/stores", icon: Building2 },
];

const storeSections: { title: string; links: MenuItem[] }[] = [
  {
    title: "Operación",
    links: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Órdenes", href: "/admin/orders", icon: ClipboardList },
      { label: "Clientes", href: "/admin/customers", icon: Users },
      { label: "Visitas", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { label: "Productos", href: "/admin/products", icon: Package },
      { label: "Combos", href: "/admin/combos", icon: Layers3 },
      { label: "Inventario", href: "/admin/inventory", icon: Boxes },
    ],
  },
  {
    title: "Envíos",
    links: [
      { label: "Dashboard de envíos", href: "/admin/shipping", icon: LayoutDashboard },
      { label: "Lista de envíos", href: "/admin/shipping/shipments", icon: Truck },
      { label: "Ajustes de envíos", href: "/admin/shipping/settings", icon: Wrench },
    ],
  },
  {
    title: "Portal comercial",
    links: [
      { label: "Configuración general", href: "/admin/portal-comercial", icon: Globe2 },
      { label: "Cotizador público", href: "/admin/portal/cotizador", icon: Calculator },
      { label: "Cotizaciones", href: "/admin/portal/cotizaciones", icon: ClipboardCheck },
    ],
  },
  {
    title: "Configuración",
    links: [{ label: "Ajustes de tienda", href: "/admin/settings", icon: Settings }],
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(value: string) {
  return (
    value
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "AD"
  );
}

function MenuSection({
  title,
  links,
  pathname,
  onClose,
  primaryColor,
}: {
  title: string;
  links: MenuItem[];
  pathname: string;
  onClose: () => void;
  primaryColor: string;
}) {
  return (
    <section className="space-y-2">
      <p className="px-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      {links.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-4 rounded-2xl px-4 py-3.5 text-base font-black transition ${
              active ? "bg-slate-100 shadow-sm" : "text-[#061b3a] hover:bg-slate-50"
            }`}
            style={active ? { color: primaryColor } : undefined}
          >
            <Icon size={22} />
            {item.label}
          </Link>
        );
      })}
    </section>
  );
}

export default function StoreAdminMobileMenu({ open, onClose }: AdminMobileMenuProps) {
  const pathname = usePathname();
  const { store } = useStore();
  const { isSuperAdmin, store: accessStore, profile, access } = useAdminAccess();
  const activeStore = isSuperAdmin ? store || accessStore : accessStore;
  const primaryColor = activeStore?.primary_color || "#0B1F4D";
  const storeName = activeStore?.name || "Tienda activa";
  const safeProfile = profile as
    | { full_name?: string; name?: string; email?: string }
    | null;
  const safeAccess = access as
    | { membership?: { role?: string }; role?: string }
    | null;
  const userName = safeProfile?.full_name || safeProfile?.name || safeProfile?.email || "Administrador";
  const role = isSuperAdmin ? "SUPER ADMIN" : safeAccess?.membership?.role || safeAccess?.role || "ADMIN";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] xl:hidden">
      <button type="button" aria-label="Cerrar menú" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

      <aside className="relative flex h-dvh w-[88%] max-w-sm flex-col overflow-hidden bg-white shadow-2xl">
        <div className="shrink-0 px-5 py-5 text-white" style={{ backgroundColor: primaryColor }}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <Store size={22} />
              </div>
              <h2 className="truncate text-xl font-black">{storeName}</h2>
              <p className="text-sm font-bold text-white/65">Administración de tienda</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="shrink-0 border-b border-slate-100 px-5 py-4">
            <StoreSwitcher />
          </div>
        )}

        <nav className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-4 py-5">
          {isSuperAdmin && (
            <MenuSection title="Plataforma SaaS" links={saasLinks} pathname={pathname} onClose={onClose} primaryColor={primaryColor} />
          )}
          {storeSections.map((section) => (
            <MenuSection key={section.title} title={section.title} links={section.links} pathname={pathname} onClose={onClose} primaryColor={primaryColor} />
          ))}
          <Link href="/portal" target="_blank" onClick={onClose} className="flex items-center gap-4 rounded-2xl px-4 py-3.5 text-base font-black text-[#061b3a] hover:bg-slate-50">
            <ExternalLink size={22} />
            Ver experiencia pública
          </Link>
        </nav>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white" style={{ backgroundColor: primaryColor }}>
              {initials(userName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-950">{userName}</p>
              <p className="truncate text-[11px] font-black uppercase tracking-wider text-slate-500">{role}</p>
              <p className="truncate text-xs font-semibold text-slate-500">{storeName}</p>
            </div>
          </div>
          <LogoutButton onLoggedOut={onClose} className="bg-[#061b3a] text-white shadow-lg hover:opacity-90" />
        </div>
      </aside>
    </div>
  );
}
