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
  Layers3,
  ExternalLink,
  Rocket,
} from "lucide-react";

import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";

type Props = {
  open: boolean;
  onClose: () => void;
};

type MenuItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const links: MenuItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Productos", href: "/admin/products", icon: Package },
  { label: "Categorías", href: "/admin/categories", icon: Tags },
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

export default function StoreAdminMobileMenu({ open, onClose }: Props) {
  const pathname = usePathname();
  const { store } = useStore();
  const { isSuperAdmin } = useAdminAccess();

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
            <h2 className="text-xl font-black text-[#061b3a]">Tienda</h2>
            <p className="truncate text-sm font-bold text-slate-500">
              {store?.name || "Tienda activa"}
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

        <nav className="grid gap-2 px-4 py-5 pb-10">
          {isSuperAdmin && (
            <Link
              href="/admin/saas"
              onClick={onClose}
              className="mb-2 flex items-center gap-4 rounded-2xl bg-[#061b3a] px-4 py-4 text-base font-black text-white transition hover:opacity-95"
            >
              <Rocket size={24} />
              Volver al SaaS
            </Link>
          )}

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
        </nav>
      </aside>
    </div>
  );
}
