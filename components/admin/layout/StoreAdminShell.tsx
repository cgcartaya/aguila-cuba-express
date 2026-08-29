"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Menu, Rocket, Store } from "lucide-react";

import StoreAdminNav from "@/components/admin/nav/StoreAdminNav";
import StoreAdminMobileMenu from "@/components/admin/nav/StoreAdminMobileMenu";
import MobileAdminBottomNav from "@/components/admin/MobileAdminBottomNav";
import StoreSwitcher from "@/components/admin/StoreSwitcher";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { getStoreTheme } from "@/lib/admin/theme";

export default function StoreAdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();

  const { store: selectedStore, clearCurrentStore } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) {
      return selectedStore || accessStore;
    }

    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

  useEffect(() => {
    if (accessLoading) return;

    if (!activeStore && selectedStore) {
      clearCurrentStore();
    }
  }, [accessLoading, activeStore, selectedStore, clearCurrentStore]);

  const storeName =
    activeStore?.name ||
    (isSuperAdmin ? "Administración General" : "Tienda activa");

  const theme = getStoreTheme(activeStore);

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreAdminNav />

      <div className="min-h-screen min-w-0 xl:ml-72">
        <header className="sticky top-0 z-40 border-b bg-white/90 px-4 py-3 backdrop-blur xl:hidden">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-[#061b3a]"
              aria-label="Abrir menú"
            >
              <Menu size={24} />
            </button>

            <div className="flex min-w-0 items-center gap-2">
              <Store
                className="h-5 w-5 shrink-0"
                style={{ color: theme.accentOnWhite }}
              />
              <span
                className="truncate text-sm font-black"
                style={{ color: theme.accentOnWhite }}
              >
                {accessLoading ? "Cargando tienda..." : storeName}
              </span>
            </div>

            {isSuperAdmin ? (
              <Link
                href="/admin/saas"
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#061b3a] text-white"
                aria-label="Volver al panel SaaS"
              >
                <Rocket size={22} />
              </Link>
            ) : (
              <div className="h-11 w-11" />
            )}
          </div>
        </header>

        {isSuperAdmin && (
          <div className="border-b bg-white px-4 py-3 xl:hidden">
            <StoreSwitcher />
          </div>
        )}

        {isSuperAdmin && (
          <div className="sticky top-0 z-30 hidden h-14 border-b border-slate-200 bg-white/95 px-6 backdrop-blur xl:flex xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                <Store size={16} />
              </span>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                  Tienda activa
                </p>
                <p className="truncate text-sm font-black text-[#061b3a]">
                  {accessLoading ? "Cargando tienda..." : storeName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/saas"
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-[#061b3a] transition hover:bg-slate-50"
              >
                <Rocket size={15} />
                Panel SaaS
              </Link>

              <StoreSwitcher compact />
            </div>
          </div>
        )}

        {children}
      </div>

      <StoreAdminMobileMenu open={open} onClose={() => setOpen(false)} />
      <MobileAdminBottomNav />
    </div>
  );
}
