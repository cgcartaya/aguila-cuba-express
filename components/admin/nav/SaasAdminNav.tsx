"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Rocket,
  Building2,
  LayoutDashboard,
  Store,
  Settings,
  BarChart3,
} from "lucide-react";

import LogoutButton from "@/components/admin/LogoutButton";

type AdminLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const saasLinks: AdminLink[] = [
  { href: "/admin/saas", label: "Dashboard SaaS", icon: LayoutDashboard },
  { href: "/admin/stores", label: "Tiendas", icon: Building2 },
  { href: "/admin/saas/metrics", label: "Métricas", icon: BarChart3 },
  { href: "/admin/saas/settings", label: "Ajustes SaaS", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SaasAdminNav() {
  const pathname = usePathname();
  const primaryColor = "#111827";

  return (
    <aside className="hidden min-h-screen w-72 bg-slate-950 p-5 text-white shadow-xl xl:block">
      <div className="mb-8">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Rocket size={24} />
        </div>

        <h1 className="text-xl font-black text-white">SaaS Admin</h1>
        <p className="text-sm font-semibold text-white/60">
          Plataforma multitienda
        </p>
      </div>

      <Link
        href="/admin/stores"
        className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold text-slate-950 shadow-lg transition hover:opacity-90"
      >
        <Store size={18} />
        Administrar tiendas
      </Link>

      <nav className="space-y-2">
        {saasLinks.map((link) => {
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
          href="/admin"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-white transition hover:bg-white/10"
        >
          <Store size={20} />
          Ir a tienda activa
        </Link>
      </div>

      <div className="mt-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
