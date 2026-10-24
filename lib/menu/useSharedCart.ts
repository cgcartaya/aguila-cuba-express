"use client";

import { useCallback, useEffect, useState } from "react";
import type { MenuCartLine } from "./types";

function storageKey(storeSlug: string) {
  return `perla_menu_cart_v1_${storeSlug}`;
}

function readCart(storeSlug: string): MenuCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(storeSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((line): line is MenuCartLine => Boolean(line && typeof line.lineId === "string" && typeof line.menu_item_id === "string" && typeof line.name === "string" && Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 9999 && Number.isFinite(line.unit_base_price) && line.unit_base_price >= 0 && Array.isArray(line.selected_options) && line.selected_options.every((option: Record<string, unknown>) => option && typeof option.group_id === "string" && typeof option.option_id === "string" && Number.isFinite(option.price_delta)))) : [];
  } catch {
    return [];
  }
}

function writeCart(storeSlug: string, cart: MenuCartLine[]) {
  if (typeof window === "undefined") return;
  try {
    if (cart.length === 0) {
      window.localStorage.removeItem(storageKey(storeSlug));
    } else {
      window.localStorage.setItem(storageKey(storeSlug), JSON.stringify(cart));
    }
  } catch {
    // localStorage puede fallar (modo privado, cuota llena, etc.) — no
    // rompemos la app por esto, el carrito solo se pierde al recargar.
  }
}

/**
 * Carrito de la carta persistido en localStorage y COMPARTIDO entre
 * la landing (vitrina/promo — agregar rápido) y /menu/[slug] (donde
 * se termina de armar el pedido y se envía por WhatsApp). Cada tienda
 * usa su propia llave (storeSlug), así que el carrito de un tenant
 * nunca se mezcla con el de otro.
 *
 * También se sincroniza entre pestañas/ventanas del mismo navegador
 * (evento "storage" nativo), por si el cliente tiene la landing y la
 * carta abiertas al mismo tiempo.
 */
export function useSharedCart(storeSlug: string) {
  // Arranca vacío y se hidrata en el primer efecto: evita mismatch de
  // SSR (el server nunca conoce el contenido de localStorage).
  const [state, setCartState] = useState<{ slug: string; cart: MenuCartLine[] }>({ slug: "", cart: [] });
  const cart = state.slug === storeSlug ? state.cart : [];
  const hydrated = state.slug === storeSlug;

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) setCartState({ slug: storeSlug, cart: readCart(storeSlug) }); });
    return () => { active = false; };
  }, [storeSlug]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === null || e.key === storageKey(storeSlug)) {
        setCartState({ slug: storeSlug, cart: readCart(storeSlug) });
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storeSlug]);

  const setCart = useCallback(
    (updater: MenuCartLine[] | ((prev: MenuCartLine[]) => MenuCartLine[])) => {
      setCartState((state) => {
        const prev = state.slug === storeSlug ? state.cart : readCart(storeSlug);
        const next =
          typeof updater === "function"
            ? (updater as (p: MenuCartLine[]) => MenuCartLine[])(prev)
            : updater;
        writeCart(storeSlug, next);
        return { slug: storeSlug, cart: next };
      });
    },
    [storeSlug]
  );

  const clearCart = useCallback(() => setCart([]), [setCart]);

  return { cart, setCart, clearCart, hydrated };
}
