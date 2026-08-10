"use client";

/* =========================================================
   useLowStockCount

   Cuenta productos activos con stock bajo (<=5) o agotado (0),
   usando el mismo umbral que ya usa InventoryManager para sus
   tarjetas "Bajo stock" / "Sin stock". Se usa para el badge del
   menú lateral, así el dueño de tienda ve que algo necesita
   atención sin tener que entrar a Inventario primero.
========================================================= */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const LOW_STOCK_THRESHOLD = 5;

export function useLowStockCount(storeId?: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    if (!storeId) {
      setCount(0);
      return;
    }

    async function load() {
      const { count: result, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .lte("stock", LOW_STOCK_THRESHOLD);

      if (!mounted) return;

      if (error) {
        console.error("Error cargando conteo de bajo stock:", error);
        setCount(0);
        return;
      }

      setCount(result || 0);
    }

    load();

    // Se refresca al volver a enfocar la pestaña — cubre el caso
    // típico de ajustar stock en otra pestaña y volver a esta.
    function handleFocus() {
      load();
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleFocus);
    };
  }, [storeId]);

  return count;
}
