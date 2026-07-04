"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminAccess } from "@/lib/admin/access";
import { getCurrentAdminAccess } from "@/lib/admin/access-service";

export function useAdminAccess() {
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getCurrentAdminAccess();
    setAccess(result.data);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
