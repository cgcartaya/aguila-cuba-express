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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <StoreAdminNav />

      <div className="min-w-0 flex-1">
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
              <Store className="h-5 w-5 shrink-0 text-[#061b3a]" />
              <span className="truncate text-sm font-black text-[#061b3a]">
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

        <div className="hidden border-b bg-white px-6 py-4 xl:block">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-500">
                Panel operativo
              </p>

              <h2 className="text-2xl font-black text-[#061b3a]">
                {accessLoading ? "Cargando tienda..." : storeName}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {isSuperAdmin && (
                <Link
                  href="/admin/saas"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#061b3a] shadow-sm transition hover:bg-slate-50"
                >
                  <Rocket size={18} />
                  Panel SaaS
                </Link>
              )}

              <StoreSwitcher />
            </div>
          </div>
        </div>

        {children}
      </div>

      <StoreAdminMobileMenu open={open} onClose={() => setOpen(false)} />
      <MobileAdminBottomNav />
    </div>
  );
}