"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Rocket,
  Building2,
  LayoutDashboard,
  Store,
  Settings,
  BarChart3,
} from "lucide-react";

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
  { label: "Dashboard SaaS", href: "/admin/saas", icon: LayoutDashboard },
  { label: "Tiendas", href: "/admin/stores", icon: Building2 },
  { label: "Métricas", href: "/admin/saas/metrics", icon: BarChart3 },
  { label: "Ajustes SaaS", href: "/admin/saas/settings", icon: Settings },
  { label: "Ir a tienda activa", href: "/admin", icon: Store },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SaasAdminMobileMenu({ open, onClose }: Props) {
  const pathname = usePathname();

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
            <h2 className="text-xl font-black text-[#061b3a]">SaaS Admin</h2>
            <p className="truncate text-sm font-bold text-slate-500">
              Plataforma multitienda
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
                    ? "bg-slate-900 text-white"
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
