"use client";

import { Users } from "lucide-react";
import { useAdminAccess } from "@/hooks/useAdminAccess";

export default function AdminCustomersPage() {
  const { store } = useAdminAccess();

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-28 md:p-6 lg:pb-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="flex items-center gap-3 text-3xl font-black text-[#061b3a]">
            <Users size={34} />
            Clientes
          </h1>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Clientes de {store?.name || "la tienda activa"}.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <Users size={42} className="mx-auto mb-4 text-slate-400" />

          <h2 className="text-xl font-black text-[#061b3a]">
            Módulo de clientes pendiente de migración
          </h2>

          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-500">
            Para la demo, productos, órdenes, inventario, categorías y combos ya
            están separados por tienda. Clientes se migrará después agregando
            store_id a la tabla customers.
          </p>
        </div>
      </div>
    </main>
  );
}
