"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ExternalLink, Rocket, UserRound, X } from "lucide-react";

import StoreSwitcher from "@/components/admin/StoreSwitcher";
import { useStore } from "@/hooks/useStore";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useLowStockCount } from "@/hooks/useLowStockCount";
import { usePendingReservationsCount } from "@/hooks/usePendingReservationsCount";
import { usePendingMenuOrdersCount } from "@/hooks/usePendingMenuOrdersCount";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { getVisibleAdminSections, type AdminLink } from "@/lib/admin/nav-config";

type AdminMobileMenuProps = {
  open: boolean;
  onClose: () => void;
};

const saasLinks: AdminLink[] = [
  { label: "Dashboard SaaS", href: "/admin/saas", icon: Rocket },
  { label: "Tiendas", href: "/admin/stores", icon: Building2 },
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
  lowStockCount,
  pendingReservationsCount,
  pendingMenuOrdersCount,
}: {
  title: string;
  links: AdminLink[];
  pathname: string;
  onClose: () => void;
  lowStockCount: number;
  pendingReservationsCount: number;
  pendingMenuOrdersCount: number;
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
              isActive ? "bg-red-50 text-red-600" : "text-[#061b3a] hover:bg-slate-50"
            }`}
          >
            <Icon size={24} />
            {item.label}

            {item.href === "/admin/inventory" && lowStockCount > 0 && (
              <span className="ml-auto flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white">
                {lowStockCount > 99 ? "99+" : lowStockCount}
              </span>
            )}

            {item.href === "/admin/reservas/solicitudes" && pendingReservationsCount > 0 && (
              <span className="ml-auto flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white">
                {pendingReservationsCount > 99 ? "99+" : pendingReservationsCount}
              </span>
            )}

            {item.href === "/admin/menu/ordenes" && pendingMenuOrdersCount > 0 && (
              <span className="ml-auto flex h-6 min-w-[24px] items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-black text-white">
                {pendingMenuOrdersCount > 99 ? "99+" : pendingMenuOrdersCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}

export default function StoreAdminMobileMenu({ open, onClose }: AdminMobileMenuProps) {
  const pathname = usePathname();
  const { store } = useStore();
  const { isSuperAdmin, store: accessStore } = useAdminAccess();
  const { profile } = useAdminProfile();

  const activeStore = isSuperAdmin ? store || accessStore : accessStore;
  const sections = getVisibleAdminSections(accessStore, isSuperAdmin);
  const lowStockCount = useLowStockCount(activeStore?.id);
  const pendingReservationsCount = usePendingReservationsCount(activeStore?.id);
  const pendingMenuOrdersCount = usePendingMenuOrdersCount(activeStore?.id);

  const initials = profile.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || profile.email.slice(0, 1).toUpperCase() || "U";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] xl:hidden">
      <button type="button" aria-label="Cerrar menú" onClick={onClose} className="absolute inset-0 bg-black/45" />

      <aside className="relative h-full w-[84%] max-w-sm overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin/account" onClick={onClose} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#061b3a] text-sm font-black text-white shadow-sm">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Mi perfil" className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </Link>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-[#061b3a]">{profile.fullName || "Mi cuenta"}</h2>
              <p className="truncate text-sm font-bold text-slate-500">
                {activeStore?.name || (isSuperAdmin ? "Administración General" : "Tienda activa")}
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-[#061b3a]">
            <X size={24} />
          </button>
        </div>

        {isSuperAdmin && (
          <div className="border-b border-slate-100 px-5 py-4">
            <StoreSwitcher />
          </div>
        )}

        <nav className="grid gap-7 px-4 py-5 pb-10">
          {isSuperAdmin && (
            <MenuSection
              title="Plataforma SaaS"
              links={saasLinks}
              pathname={pathname}
              onClose={onClose}
              lowStockCount={lowStockCount}
              pendingReservationsCount={pendingReservationsCount}
              pendingMenuOrdersCount={pendingMenuOrdersCount}
            />
          )}

          {sections.map((section) => (
            <MenuSection
              key={section.title}
              title={section.title}
              links={section.links}
              pathname={pathname}
              onClose={onClose}
              lowStockCount={lowStockCount}
              pendingReservationsCount={pendingReservationsCount}
              pendingMenuOrdersCount={pendingMenuOrdersCount}
            />
          ))}

          <MenuSection
            title="Cuenta"
            links={[{ label: "Mi perfil", href: "/admin/account", icon: UserRound }]}
            pathname={pathname}
            onClose={onClose}
            lowStockCount={lowStockCount}
            pendingReservationsCount={pendingReservationsCount}
            pendingMenuOrdersCount={pendingMenuOrdersCount}
          />

          <MenuSection
            title="Tienda"
            links={[{ label: "Ver tienda pública", href: "/tienda", icon: ExternalLink }]}
            pathname={pathname}
            onClose={onClose}
            lowStockCount={lowStockCount}
            pendingReservationsCount={pendingReservationsCount}
            pendingMenuOrdersCount={pendingMenuOrdersCount}
          />
        </nav>
      </aside>
    </div>
  );
}
