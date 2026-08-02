"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Home } from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getStoreTheme } from "@/lib/admin/theme";

export type AdminBreadcrumb = {
  label: string;
  href?: string;
};

type AdminPageHeaderProps = {
  eyebrow?: string;
  badge?: string;
  title: string;
  description?: string;
  storeName?: string | null;
  breadcrumbs?: AdminBreadcrumb[];
  actions?: ReactNode;
  stats?: ReactNode;

  // Compatibilidad con páginas administrativas antiguas.
  icon?: LucideIcon;
  actionLabel?: string;
  actionHref?: string;
};

export default function AdminPageHeader({
  eyebrow,
  badge,
  title,
  description,
  storeName,
  breadcrumbs = [],
  actions,
  stats,
  icon: Icon,
  actionLabel,
  actionHref,
}: AdminPageHeaderProps) {
  const visibleEyebrow = eyebrow || badge;

  const { isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const activeStore = isSuperAdmin ? selectedStore || accessStore : accessStore;
  const theme = getStoreTheme(activeStore);

  const legacyAction =
    !actions && actionHref && actionLabel ? (
      <Link
        href={actionHref}
        className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        style={{ color: theme.primary }}
      >
        {actionLabel}
      </Link>
    ) : null;

  return (
    <header className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div
        className="relative overflow-hidden px-5 py-6 md:px-7 md:py-7"
        style={{ background: theme.headerGradient, color: theme.textOnPrimary }}
      >
        {/* El color secundario se usa como acento (glow difuminado + borde
            inferior), nunca detrás del texto, así el contraste queda
            garantizado sin importar qué color elija cada tienda. */}
        <div
          className="absolute -right-14 -top-20 h-52 w-52 rounded-full blur-2xl"
          style={{ backgroundColor: theme.secondaryGlow }}
        />
        <div
          className="absolute -bottom-24 left-1/3 h-48 w-48 rounded-full blur-2xl"
          style={{ backgroundColor: theme.secondaryGlowStrong }}
        />

        <div className="relative">
          <nav
            className="mb-4 flex flex-wrap items-center gap-1.5 text-xs font-bold"
            style={{ color: theme.mutedTextOnPrimary }}
          >
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 transition hover:opacity-80"
            >
              <Home size={13} />
              Administración
            </Link>

            {breadcrumbs.map((item) => (
              <span
                key={`${item.label}-${item.href || "current"}`}
                className="inline-flex items-center gap-1.5"
              >
                <ChevronRight size={13} className="opacity-60" />
                {item.href ? (
                  <Link
                    href={item.href}
                    className="transition hover:opacity-80"
                    style={{ color: theme.textOnPrimary }}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span style={{ color: theme.textOnPrimary }}>{item.label}</span>
                )}
              </span>
            ))}
          </nav>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              {visibleEyebrow && (
                <div className="flex items-center gap-2">
                  {Icon && (
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-xl"
                      style={{ backgroundColor: theme.secondaryChipBg, color: theme.textOnPrimary }}
                    >
                      <Icon size={16} />
                    </span>
                  )}

                  <p
                    className="text-xs font-extrabold uppercase tracking-[0.16em]"
                    style={{ color: theme.secondary }}
                  >
                    {visibleEyebrow}
                  </p>
                </div>
              )}

              <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">
                {title}
              </h1>

              {description && (
                <p
                  className="mt-2 max-w-2xl text-sm font-medium leading-6 md:text-base"
                  style={{ color: theme.mutedTextOnPrimary }}
                >
                  {description}
                </p>
              )}

              {storeName && (
                <p
                  className="mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-bold"
                  style={{ backgroundColor: theme.secondaryChipBg, color: theme.textOnPrimary }}
                >
                  {storeName}
                </p>
              )}
            </div>

            {(actions || legacyAction) && (
              <div className="flex flex-wrap gap-2">
                {actions}
                {legacyAction}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Franja fina con el color secundario: el "acento" que separa el
          header del contenido, visible incluso cuando el glow de arriba
          casi no se nota (colores muy claros u oscuros). */}
      <div className="h-1" style={{ backgroundColor: theme.secondary }} />

      {stats && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-4 md:px-7">
          {stats}
        </div>
      )}
    </header>
  );
}
