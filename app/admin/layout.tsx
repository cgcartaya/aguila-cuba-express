"use client";

/* =========================================================
   ADMIN LAYOUT

   Desktop grande:
   - Sidebar lateral

   Móvil + Tablet:
   - Botón hamburguesa
   - Drawer lateral
   - Bottom navigation
========================================================= */

import { useState } from "react";
import { Menu } from "lucide-react";

import AdminNav from "@/components/admin/AdminNav";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import AdminMobileMenu from "@/components/admin/AdminMobileMenu";
import StoreSwitcher from "@/components/admin/StoreSwitcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#F8FAFC] xl:flex">
        {/* =====================================================
            SIDEBAR SOLO EN PANTALLAS MUY GRANDES
        ===================================================== */}
        <div className="hidden xl:block">
          <AdminNav />
        </div>

        {/* =====================================================
            CONTENIDO PRINCIPAL
        ===================================================== */}
        <div className="relative flex-1 pb-24 xl:pb-0">

          {/* =====================================================
      SELECTOR DE TIENDA SAAS
  ===================================================== */}
  <div className="sticky top-0 z-40 border-b bg-[#F8FAFC]/95 px-4 py-3 backdrop-blur">
    <StoreSwitcher />
  </div>
          {/* =====================================================
              BOTÓN HAMBURGUESA MÓVIL + TABLET
          ===================================================== */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú admin"
            className="
              fixed
              right-4
              top-4
              z-50
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              bg-gradient-to-r
              from-[#0B1F4D]
              to-[#2563EB]
              text-white
              shadow-xl
              transition
              hover:scale-105
              xl:hidden
            "
          >
            <Menu size={24} />
          </button>

          {children}
        </div>

        {/* =====================================================
            BOTTOM NAV PARA MÓVIL Y TABLET
        ===================================================== */}
        <div className="xl:hidden">
          <AdminBottomNav />
        </div>

        {/* =====================================================
            MENÚ LATERAL MÓVIL/TABLET
        ===================================================== */}
        <AdminMobileMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
        />
      </div>
    </AdminAuthGuard>
  );
}