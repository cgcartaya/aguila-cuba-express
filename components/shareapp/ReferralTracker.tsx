"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/hooks/useStore";

export default function ReferralTracker() {
  const pathname = usePathname();
  const { store, loading } = useStore();
  useEffect(() => {
    if (loading || !store?.id || /^\/(admin|gestores|api)(\/|$)/.test(pathname))
      return;
    const storeId = store.id;
    // Context may still contain the previous tenant for one render during navigation.
    const slugPath = pathname.match(/^\/tienda\/([^/]+)/)?.[1];
    const reserved = [
      "cart",
      "checkout",
      "producto",
      "productos",
      "combos",
      "categorias",
      "productos-destacados",
      "carrito",
      "success",
      "pago-exitoso",
      "pago-cancelado",
    ];
    if (slugPath && !reserved.includes(slugPath) && slugPath !== store.slug)
      return;
    const marker = `shareapp:${storeId}`;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("perla_ref") === storeId)
        localStorage.setItem(marker, String(Date.now() + 30 * 86400000));
      if (Number(localStorage.getItem(marker) || 0) < Date.now()) return;
    } catch {
      return;
    }
    // The marker is only an optimization. The server validates the HttpOnly signed cookie.
    const item = pathname.match(
      /\/(producto|combos)\/([a-f0-9-]{36})(?:\/|$)/i,
    );
    const events = [
      { kind: "page_view", itemId: null as string | null },
      ...(item ? [{ kind: "product_view", itemId: item[2] }] : []),
    ];
    for (const event of events) {
      void fetch("/api/shareapp/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, path: pathname, ...event }),
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname, store?.id, store?.slug, loading]);
  return null;
}
