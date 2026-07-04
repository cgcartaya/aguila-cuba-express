"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Menu, Rocket } from "lucide-react";

import SaasAdminNav from "@/components/admin/nav/SaasAdminNav";
import SaasAdminMobileMenu from "@/components/admin/nav/SaasAdminMobileMenu";

export default function SaasAdminShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SaasAdminNav />

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
              <Rocket className="h-5 w-5 shrink-0 text-[#061b3a]" />
              <span className="truncate text-sm font-black text-[#061b3a]">
                Administración SaaS
              </span>
            </div>
          </div>
        </header>

        <div className="hidden border-b bg-white px-6 py-4 xl:block">
          <p className="text-sm font-bold text-slate-500">Super Admin</p>
          <h2 className="text-2xl font-black text-[#061b3a]">
            Plataforma SaaS multitienda
          </h2>
        </div>

        {children}
      </div>

      <SaasAdminMobileMenu open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
