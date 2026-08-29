"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  History,
  KeyRound,
  LayoutDashboard,
  Rocket,
  Settings,
  Store,
} from "lucide-react";

import LogoutButton from "@/components/admin/LogoutButton";
import { getSaasSettings, type SaasSettings } from "@/lib/saas/settings-service";

type AdminLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const mainLinks: AdminLink[] = [
  { href: "/admin/saas", label: "Dashboard general", icon: LayoutDashboard },
  { href: "/admin/stores", label: "Tiendas", icon: Building2 },
];

const analyticsLinks: AdminLink[] = [
  { href: "/admin/saas/metrics", label: "Métricas", icon: BarChart3 },
  {
    href: "/admin/saas/movimientos-inventario",
    label: "Movimientos inventario",
    icon: History,
  },
];

const configLinks: AdminLink[] = [
  { href: "/admin/saas/settings", label: "Configuración SaaS", icon: Settings },
  { href: "/admin/account/password", label: "Mi contraseña", icon: KeyRound },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin/saas") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Section({
  title,
  links,
  pathname,
}: {
  title: string;
  links: AdminLink[];
  pathname: string;
}) {
  return (
    <div className="space-y-1.5">
      <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      {links.map((link) => {
        const Icon = link.icon
        const active = isActivePath(pathname, link.href)

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black transition ${
              active
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <span
              className={`grid h-8 w-8 place-items-center rounded-xl ${
                active ? "bg-blue-100" : "bg-slate-100"
              }`}
            >
              <Icon size={16} />
            </span>
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}

export default function SaasAdminNav() {
  const pathname = usePathname()
  const [settings, setSettings] = useState<SaasSettings | null>(null)

  useEffect(() => {
    let mounted = true
    getSaasSettings().then((data) => {
      if (mounted) setSettings(data)
    })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <aside className="hidden min-h-screen w-[270px] shrink-0 border-r border-slate-200 bg-white p-4 xl:flex xl:flex-col">
      <div className="flex items-center gap-3 px-2 py-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
          <Rocket size={21} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Super Admin</p>
          <h1 className="text-base font-black leading-tight text-blue-700">
            Plataforma SaaS
          </h1>
          <p className="text-xs font-semibold text-slate-400">multitienda</p>
        </div>
      </div>

      <Link
        href="/admin/stores"
        className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700"
      >
        <Store size={17} />
        Administrar tiendas
      </Link>

      <nav className="mt-7 space-y-7">
        <Section title="Principal" links={mainLinks} pathname={pathname} />
        <Section title="Analítica" links={analyticsLinks} pathname={pathname} />
        <Section title="Configuración" links={configLinks} pathname={pathname} />
      </nav>

      <div className="mt-auto space-y-3 pt-7">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
        >
          <Store size={17} />
          Ir a tienda activa
        </Link>

        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-700">Super Admin</p>
          <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
            {settings ? "Panel SaaS configurado" : "Cargando configuración..."}
          </p>
        </div>

        <LogoutButton />
      </div>
    </aside>
  )
}
