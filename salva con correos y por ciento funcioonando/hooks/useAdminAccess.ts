"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminAccess } from "@/lib/admin/access";
import {
  getCurrentAdminAccessCached,
  invalidateAdminAccessCache,
} from "@/lib/admin/access-service";

export function useAdminAccess() {
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh: boolean) => {
    setLoading(true);
    const result = await getCurrentAdminAccessCached({ forceRefresh });
    setAccess(result.data);
    setError(result.error);
    setLoading(false);
  }, []);

  // refresh() sigue forzando una consulta real (no cache) — lo
  // usan flujos como cambiar de tienda o refrescar permisos.
  const refresh = useCallback(async () => {
    invalidateAdminAccessCache();
    await load(true);
  }, [load]);

  useEffect(() => {
    load(false);
  }, [load]);

  return {
    access,
    loading,
    error,
    refresh,
    isSuperAdmin: access?.isSuperAdmin ?? false,
    store: access?.store ?? null,
    profile: access?.profile ?? null,
  };
}
