"use client";

/* =========================================================
   usePendingReservationsCount

   Cuenta solicitudes de reserva en estado "pending", mismo patrón
   que useLowStockCount — se usa para el badge del menú lateral y
   del botón "Ver solicitudes", así el negocio ve que hay algo
   nuevo sin tener que entrar primero.
========================================================= */

import { useEffect, useId, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export function usePendingReservationsCount(storeId?: string | null) {
  const [count, setCount] = useState(0);
  const instanceId = useId().replace(/:/g, "");
  const channelSequence = useRef(0);

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
    let realtimeTimer: number | undefined;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    channelSequence.current += 1;

    try {
      channel = supabase
        .channel(`store:${storeId}:pending-reservations-count:${instanceId}:${channelSequence.current}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reservations",
            filter: `store_id=eq.${storeId}`,
          },
          () => {
            if (realtimeTimer) window.clearTimeout(realtimeTimer);
            realtimeTimer = window.setTimeout(load, 200);
          }
        )
        .subscribe();
    } catch (error) {
      // El conteo por foco y cada 60 s continúa funcionando como respaldo.
      console.warn("No se pudo iniciar Realtime para el contador de reservas:", error);
    }

    // Refresca cada 60s mientras la pestaña está abierta, ya que las
    // solicitudes pueden llegar en cualquier momento. El intervalo queda
    // como respaldo si la conexión Realtime se interrumpe.
    const interval = window.setInterval(load, 60000);

    return () => {
      mounted = false;
      if (realtimeTimer) window.clearTimeout(realtimeTimer);
      if (channel) void supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
      window.clearInterval(interval);
    };
  }, [instanceId, storeId]);

  return count;
}
