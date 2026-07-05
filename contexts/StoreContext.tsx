"use client";

/* =========================================================
   STORE CONTEXT

   Fase 3.8 - Contexto único de tienda

   Reglas:
   - En admin NO se usa getDefaultStore().
   - En admin:
     Super Admin  -> puede usar localStorage para escoger tienda.
     Store Owner  -> la tienda real viene de useAdminAccess en cada módulo.
   - En tienda pública:
     /tienda/[slug] -> resuelve por slug.
     /tienda        -> fallback a tienda default actual.
========================================================= */

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { usePathname } from "next/navigation";

import type { Store } from "@/lib/saas/store-types";

import {
  getDefaultStore,
  getStoreBySlug,
} from "@/lib/services/stores";

type StoreContextValue = {
  store: Store | null;
  loading: boolean;
  setCurrentStore: (store: Store) => void;
  clearCurrentStore: () => void;
};

const StoreContext = createContext<StoreContextValue>({
  store: null,
  loading: true,
  setCurrentStore: () => {},
  clearCurrentStore: () => {},
});

const reservedTiendaRoutes = [
  "cart",
  "producto",
  "combos",
  "productos-destacados",
];

export function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  function setCurrentStore(newStore: Store) {
    localStorage.setItem(
      "saas-current-store",
      JSON.stringify(newStore)
    );

    setStore(newStore);
  }

  function clearCurrentStore() {
    localStorage.removeItem("saas-current-store");
    setStore(null);
  }

  useEffect(() => {
    let mounted = true;

    async function loadStore() {
      setLoading(true);

      const isAdminRoute = pathname.startsWith("/admin");
      const isTiendaRoute = pathname.startsWith("/tienda");

      /* ===============================================
         ADMIN

         Nunca usamos getDefaultStore() en admin.
         Si hay tienda en localStorage, se usa solo para
         Super Admin. Para Store Owner, los módulos usan
         useAdminAccess().store.
      =============================================== */

      if (isAdminRoute) {
        const savedStore = localStorage.getItem("saas-current-store");

        if (savedStore) {
          try {
            const parsedStore = JSON.parse(savedStore) as Store;

            if (mounted) {
              setStore(parsedStore);
              setLoading(false);
            }

            return;
          } catch {
            localStorage.removeItem("saas-current-store");
          }
        }

        if (mounted) {
          setStore(null);
          setLoading(false);
        }

        return;
      }

      /* ===============================================
         /tienda/[slug]
      =============================================== */

      if (isTiendaRoute) {
        const parts = pathname.split("/").filter(Boolean);
        const possibleSlug = parts[1];

        if (
          possibleSlug &&
          !reservedTiendaRoutes.includes(possibleSlug)
        ) {
          const storeBySlug = await getStoreBySlug(possibleSlug);

          if (storeBySlug) {
            if (mounted) {
              setStore(storeBySlug);
              setLoading(false);
            }

            return;
          }
        }
      }

      /* ===============================================
         TIENDA PÚBLICA DEFAULT

         Esto queda solo para /tienda mientras Águila siga
         siendo la tienda principal pública.
      =============================================== */

      const defaultStoreResult = await getDefaultStore();
      const data = defaultStoreResult?.data ?? null;

      if (mounted) {
        setStore((data as Store) || null);
        setLoading(false);
      }
    }

    loadStore();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  return (
    <StoreContext.Provider
      value={{
        store,
        loading,
        setCurrentStore,
        clearCurrentStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
