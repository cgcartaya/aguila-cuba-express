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

/*
 * Header plano tipo panel de administración "serio" (Stripe/Linear/
 * Vercel), no un hero de landing. El color de marca de la tienda
 * aparece como ACENTO puntual — borde izquierdo, chip del ícono,
 * eyebrow y botón principal — nunca como fondo grande de color. Esto
 * también lo hace más robusto: el título y el texto siempre son
 * neutros (slate-900 / slate-500), así que ningún color que elija
 * ninguna tienda puede volverlos ilegibles.
 */
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
        className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
      >
        {actionLabel}
      </Link>
    ) : null;

  return (
    <header className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className="border-l-4 px-5 py-5 md:px-7 md:py-6"
        style={{ borderLeftColor: theme.primary }}
      >
        <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Link href="/admin" className="inline-flex items-center gap-1.5 transition hover:text-slate-600">
            <Home size={13} />
            Administración
          </Link>

          {breadcrumbs.map((item) => (
            <span key={`${item.label}-${item.href || "current"}`} className="inline-flex items-center gap-1.5">
              <ChevronRight size={13} className="opacity-60" />
              {item.href ? (
                <Link href={item.href} className="transition hover:text-slate-600">
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-600">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            {Icon && (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  color: theme.textOnPrimary,
                }}
              >
                <Icon size={18} />
              </span>
            )}

            <div className="min-w-0">
              {visibleEyebrow && (
                <p
                  className="text-xs font-extrabold uppercase tracking-[0.14em]"
                  style={{ color: theme.primary }}
                >
                  {visibleEyebrow}
                </p>
              )}

              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                {title}
              </h1>

              {description && (
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                  {description}
                </p>
              )}

              {storeName && (
                <p className="mt-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {storeName}
                </p>
              )}
            </div>
          </div>

          {(actions || legacyAction) && (
            <div className="flex shrink-0 flex-wrap gap-2">
              {actions}
              {legacyAction}
            </div>
          )}
        </div>
      </div>

      {stats && (
        <div className="border-t border-slate-100 bg-slate-50/70 p-4 md:px-7">
          {stats}
        </div>
      )}
    </header>
  );
}
