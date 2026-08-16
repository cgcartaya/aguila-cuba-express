"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function usePendingMenuOrdersCount(storeId?: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    if (!storeId) {
      setCount(0);
      return;
    }

    async function load() {
      const { count: result, error } = await supabase
        .from("menu_orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .in("status", ["received", "preparing"]);

      if (!mounted) return;

      if (error) {
        console.error("Error cargando conteo de órdenes pendientes:", error);
        setCount(0);
        return;
      }

      setCount(result || 0);
    }

    load();

    function handleFocus() {
      load();
    }

    window.addEventListener("focus", handleFocus);
    const interval = window.setInterval(load, 60000);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(interval);
    };
  }, [storeId]);

  return count;
}
