"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Plus, Rocket, Store } from "lucide-react";

import LogoutButton from "@/components/admin/LogoutButton";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useLowStockCount } from "@/hooks/useLowStockCount";
import { getVisibleAdminSections } from "@/lib/admin/nav-config";
import { getStoreTheme, withAlpha } from "@/lib/admin/theme";

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StoreAdminNav() {
  const pathname = usePathname();
  const { store: selectedStore } = useStore();
  const { isSuperAdmin, store: accessStore } = useAdminAccess();

  const activeStore = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const theme = getStoreTheme(activeStore);
  // Probando: el lateral ahora se pinta con el color SECUNDARIO en vez
  // del primario. El primario queda como acento (botón "Agregar
  // producto", ítem activo del menú) para que siga resaltando encima.
  const sidebarBg = theme.secondary;
  const textColor = theme.textOnSecondary;
  const accentColor = theme.primary;
  const storeName = activeStore?.name || "Tienda activa";

  const publicStoreHref = "/portal";

  const sections = getVisibleAdminSections(accessStore, isSuperAdmin);
  const lowStockCount = useLowStockCount(activeStore?.id);

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
        shadow-xl
        xl:flex
        xl:flex-col
      "
      style={{ backgroundColor: sidebarBg, color: textColor }}
    >
      <div className="mb-6 shrink-0">
        <div
          className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: withAlpha(textColor, 0.15) }}
        >
          <Store size={24} />
        </div>
        <h1 className="line-clamp-2 text-xl font-black">{storeName}</h1>
        <p className="text-sm font-semibold" style={{ color: withAlpha(textColor, 0.7) }}>
          Administración de tienda
        </p>
      </div>

      {isSuperAdmin && (
        <Link
          href="/admin/saas"
          className="mb-4 flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 font-bold shadow-lg transition hover:opacity-80"
          style={{
            borderColor: withAlpha(textColor, 0.3),
            backgroundColor: withAlpha(textColor, 0.1),
            color: textColor,
          }}
        >
          <Rocket size={18} />
          Volver al SaaS
        </Link>
      )}

      <Link
        href="/admin/products/new"
        className="mb-7 flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-lg transition hover:opacity-90"
        style={{ color: accentColor }}
      >
        <Plus size={18} />
        Agregar producto
      </Link>

      <nav
        className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain pr-2 pb-4 [scrollbar-width:thin]"
        style={{ scrollbarColor: `${withAlpha(textColor, 0.28)} transparent` }}
      >
        {sections.map((section) => (
          <section key={section.title}>
            <p
              className="mb-2 px-4 text-[11px] font-black uppercase tracking-[0.18em]"
              style={{ color: withAlpha(textColor, 0.5) }}
            >
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
                      active ? "bg-white shadow-lg" : "hover:opacity-80"
                    }`}
                    style={
                      active
                        ? { color: accentColor }
                        : { color: textColor, backgroundColor: "transparent" }
                    }
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.backgroundColor = withAlpha(textColor, 0.1);
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Icon size={19} />
                    {link.label}

                    {link.href === "/admin/inventory" && lowStockCount > 0 && (
                      <span
                        className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-black text-white"
                      >
                        {lowStockCount > 99 ? "99+" : lowStockCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className="shrink-0 border-t pt-4" style={{ borderColor: withAlpha(textColor, 0.2) }}>
        <Link
          href={publicStoreHref}
          target="_blank"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition hover:opacity-80"
          style={{ color: textColor }}
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
