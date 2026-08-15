"use client";

/* =========================================================
   usePendingReservationsCount

   Cuenta solicitudes de reserva en estado "pending", mismo patrón
   que useLowStockCount — se usa para el badge del menú lateral y
   del botón "Ver solicitudes", así el negocio ve que hay algo
   nuevo sin tener que entrar primero.
========================================================= */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function usePendingReservationsCount(storeId?: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    if (!storeId) {
      setCount(0);
      return;
    }

    async function load() {
      const { count: result, error } = await supabase
        .from("reservations")
        .select("id", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "pending");

      if (!mounted) return;

      if (error) {
        console.error("Error cargando conteo de reservas pendientes:", error);
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
    // Refresca cada 60s mientras la pestaña está abierta, ya que las
    // solicitudes pueden llegar en cualquier momento sin que el admin
    // cambie de pestaña.
    const interval = window.setInterval(load, 60000);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(interval);
    };
  }, [storeId]);

  return count;
}
