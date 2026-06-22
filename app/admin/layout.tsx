"use client";

/* =========================================================
   ADMIN LAYOUT

   Desktop:
   - Sidebar normal

   Mobile:
   - Botón hamburguesa flotante
   - Drawer lateral
   - Bottom nav
========================================================= */

import { useState } from "react";
import { Menu } from "lucide-react";

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
        {/* SIDEBAR DESKTOP */}
        <div className="hidden lg:block">
          <AdminNav />
        </div>

        {/* CONTENIDO */}
        <div className="relative flex-1 pb-24 lg:pb-0">
          {/* BOTÓN HAMBURGUESA MÓVIL */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú admin"
            className="fixed right-4 top-4 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#061b3a] text-white shadow-lg lg:hidden"
          >
            <Menu size={24} />
          </button>

          {children}
        </div>

        {/* BOTTOM NAV MÓVIL */}
        <div className="lg:hidden">
          <AdminBottomNav />
        </div>

        {/* DRAWER MÓVIL */}
        <AdminMobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
      </div>
    </AdminAuthGuard>
  );
}