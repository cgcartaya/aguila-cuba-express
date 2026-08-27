"use client";

import { useEffect, useState } from "react";
import { getEconomyModuleStatus } from "@/lib/services/economy";

export function useEconomyModule(storeId?: string | null) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!storeId) {
        if (mounted) {
          setEnabled(false);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const result = await getEconomyModuleStatus(storeId);

      if (!mounted) return;
      setEnabled(Boolean(result?.module_economy_enabled));
      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [storeId]);

  return { enabled, loading };
}
