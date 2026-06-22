"use client";

/* =========================================================
   ADMIN LAYOUT

   Layout principal del panel administrativo.

   Desktop:
   - Sidebar fijo AdminNav

   Mobile:
   - Bottom Navigation
   - Drawer lateral AdminMobileMenu
========================================================= */

import { useState } from "react";
import AdminNav from "@/components/admin/AdminNav";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import AdminMobileMenu from "@/components/admin/AdminMobileMenu";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-50 lg:flex">
        {/* Sidebar desktop */}
        <div className="hidden lg:block">
          <AdminNav />
        </div>

        {/* Contenido */}
        <div className="flex-1 pb-24 lg:pb-0">
          {/* Botón menú móvil */}
          <div className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="rounded-2xl bg-[#061b3a] px-4 py-2 text-sm font-black text-white"
            >
              ☰ Menú admin
            </button>
          </div>

          {children}
        </div>

        {/* Bottom nav móvil */}
        <div className="lg:hidden">
          <AdminBottomNav />
        </div>

        {/* Drawer móvil */}
        <AdminMobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
      </div>
    </AdminAuthGuard>
  );
}