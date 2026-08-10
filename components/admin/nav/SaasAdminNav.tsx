"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Rocket,
  Building2,
  LayoutDashboard,
  Store,
  Settings,
  BarChart3,
  KeyRound,
  History,
} from "lucide-react";

import LogoutButton from "@/components/admin/LogoutButton";
import { getSaasSettings, type SaasSettings } from "@/lib/saas/settings-service";
import { getStoreTheme, withAlpha } from "@/lib/admin/theme";

type AdminLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const saasLinks: AdminLink[] = [
  { href: "/admin/saas", label: "Dashboard SaaS", icon: LayoutDashboard },
  { href: "/admin/stores", label: "Tiendas", icon: Building2 },
  { href: "/admin/saas/metrics", label: "Métricas", icon: BarChart3 },
  {
    href: "/admin/saas/movimientos-inventario",
    label: "Movimientos de inventario",
    icon: History,
  },
  { href: "/admin/saas/settings", label: "Ajustes SaaS", icon: Settings },
  { href: "/admin/account/password", label: "Mi contraseña", icon: KeyRound },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SaasAdminNav() {
  const pathname = usePathname();
  const [settings, setSettings] = useState<SaasSettings | null>(null);

  useEffect(() => {
    let mounted = true;
    getSaasSettings().then((data) => {
      if (mounted) setSettings(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const theme = getStoreTheme(settings);
  const primaryColor = theme.primary;
  const textColor = theme.textOnPrimary;

  return (
    <aside
      className="hidden min-h-screen w-72 p-5 shadow-xl xl:block"
      style={{ backgroundColor: primaryColor, color: textColor }}
    >
      <div className="mb-8">
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: withAlpha(textColor, 0.1) }}
        >
          <Rocket size={24} />
        </div>

        <h1 className="text-xl font-black">SaaS Admin</h1>
        <p className="text-sm font-semibold" style={{ color: withAlpha(textColor, 0.6) }}>
          Plataforma multitienda
        </p>
      </div>

      <Link
        href="/admin/stores"
        className="mb-6 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-lg transition hover:opacity-90"
        style={{ color: primaryColor }}
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
              className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition hover:opacity-80"
              style={
                active
                  ? { backgroundColor: "#fff", color: primaryColor }
                  : { color: textColor }
              }
            >
              <Icon size={20} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 border-t pt-5" style={{ borderColor: withAlpha(textColor, 0.2) }}>
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition hover:opacity-80"
          style={{ color: textColor }}
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
