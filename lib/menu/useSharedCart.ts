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
    return Array.isArray(parsed) ? (parsed as MenuCartLine[]) : [];
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
  const [cart, setCartState] = useState<MenuCartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCartState(readCart(storeSlug));
    setHydrated(true);
  }, [storeSlug]);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === storageKey(storeSlug)) {
        setCartState(readCart(storeSlug));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storeSlug]);

  const setCart = useCallback(
    (updater: MenuCartLine[] | ((prev: MenuCartLine[]) => MenuCartLine[])) => {
      setCartState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: MenuCartLine[]) => MenuCartLine[])(prev)
            : updater;
        writeCart(storeSlug, next);
        return next;
      });
    },
    [storeSlug]
  );

  const clearCart = useCallback(() => setCart([]), [setCart]);

  return { cart, setCart, clearCart, hydrated };
}
