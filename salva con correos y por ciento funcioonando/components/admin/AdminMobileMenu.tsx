"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  ClipboardList,
  Settings,
  Users,
  Rocket,
  Building2,
  Layers3,
  ExternalLink,
} from "lucide-react";

import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type AdminMobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const saasLinks: MenuItem[] = [
  { label: "Dashboard SaaS", href: "/admin/saas", icon: Rocket },
  { label: "Tiendas", href: "/admin/stores", icon: Building2 },
];

const storeLinks: MenuItem[] = [
  { label: "Dashboard tienda", href: "/admin", icon: LayoutDashboard },
  { label: "Productos", href: "/admin/products", icon: Package },
  { label: "Combos", href: "/admin/combos", icon: Layers3 },
  { label: "Inventario", href: "/admin/inventory", icon: Boxes },
  { label: "Órdenes", href: "/admin/orders", icon: ClipboardList },
  { label: "Clientes", href: "/admin/customers", icon: Users },
  { label: "Ajustes tienda", href: "/admin/settings", icon: Settings },
  { label: "Ver tienda pública", href: "/tienda", icon: ExternalLink },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";

  return pathname === href || pathname.startsWith(`${href}/`);
}

function MenuSection({
  title,
  links,
  pathname,
  onClose,
}: {
  title: string;
  links: MenuItem[];
  pathname: string;
  onClose: () => void;
}) {
  if (links.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="px-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>

      {links.map((item) => {
        const Icon = item.icon;
        const isActive = isActivePath(pathname, item.href);

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
    </div>
  );
}

export default function AdminMobileMenu({ open, onClose }: AdminMobileMenuProps) {
  const pathname = usePathname();
  const { store } = useStore();
  const { isSuperAdmin, store: accessStore } = useAdminAccess();

  const activeStore = accessStore || store;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] xl:hidden">
      <button
        type="button"
        aria-label="Cerrar menú"
        onClick={onClose}
        className="absolute inset-0 bg-black/45"
      />

      <aside className="relative h-full w-[84%] max-w-sm overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <div className="min-w-0">
            <h2 className="text-xl font-black text-[#061b3a]">Admin</h2>
            <p className="truncate text-sm font-bold text-slate-500">
              {activeStore?.name || "Tienda activa"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[#061b3a]"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="grid gap-7 px-4 py-5 pb-10">
          {isSuperAdmin && (
            <MenuSection
              title="Plataforma SaaS"
              links={saasLinks}
              pathname={pathname}
              onClose={onClose}
            />
          )}

          <MenuSection
            title="Tienda activa"
            links={storeLinks}
            pathname={pathname}
            onClose={onClose}
          />
        </nav>
      </aside>
    </div>
  );
}
