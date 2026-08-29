"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronDown, Lock } from "lucide-react";

import { getStores } from "@/lib/services/stores";
import { useStore } from "@/contexts/StoreContext";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { getStoreTheme } from "@/lib/admin/theme";

import type { Store } from "@/lib/saas/store-types";

export default function StoreSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { store, setCurrentStore } = useStore();
  const { isSuperAdmin, loading, store: accessStore } = useAdminAccess();

  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    async function loadStores() {
      const data = await getStores();
      setStores(data);
    }

    loadStores();
  }, [isSuperAdmin]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selectedStore = stores.find((s) => s.id === e.target.value);

    if (!selectedStore) return;

    setCurrentStore(selectedStore);
    window.location.reload();
  }

  if (loading) {
    return null;
  }

  if (!isSuperAdmin) {
    if (!accessStore) return null;

    const theme = getStoreTheme(accessStore);

    return (
      <div
        className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm"
        style={{ borderLeftWidth: 3, borderLeftColor: theme.primary }}
      >
        <Lock className="h-5 w-5 text-slate-400" />

        <div className="min-w-0 flex-1 flex flex-col">
          <span className="text-xs text-slate-500">Tienda asignada</span>

          <span className="font-semibold" style={{ color: theme.accentOnWhite }}>
            {accessStore.name}
          </span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="relative flex h-10 min-w-[230px] items-center rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 transition focus-within:border-blue-300 focus-within:bg-white">
        <Building2 className="absolute left-3 h-4 w-4 text-slate-500" />

        <select
          value={store?.id || ""}
          onChange={handleChange}
          aria-label="Cambiar tienda activa"
          className="h-full w-full appearance-none bg-transparent pr-7 text-xs font-black text-[#061b3a] outline-none"
        >
          <option value="">Cambiar tienda...</option>

          {stores.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm">
      <Building2 className="h-5 w-5 text-slate-600" />

      <div className="flex flex-col">
        <span className="text-xs text-slate-500">Tienda activa</span>

        <select
          value={store?.id || ""}
          onChange={handleChange}
          className="w-full min-w-0 bg-transparent font-semibold outline-none"
        >
          <option value="">Seleccionar tienda</option>

          {stores.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
