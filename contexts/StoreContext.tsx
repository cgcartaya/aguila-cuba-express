"use client";

/* =========================================================
   STORE CONTEXT

   Multiempresa + dominios:
   - Admin: no usa getDefaultStore().
   - /tienda/[slug]: resuelve por slug.
   - Dominios personalizados: resuelve por domain.
   - Subdominios de PerlaMarketplace:
     dlracing.perlamarketplace.com -> resuelve por subdomain.
   - /tienda: fallback a tienda default actual.
========================================================= */

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import type { Store } from "@/lib/saas/store-types";

import {
  getDefaultStore,
  getStoreByDomain,
  getStoreBySlug,
  getStoreBySubdomain,
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

const PLATFORM_DOMAIN = "perlamarketplace.com";

const reservedTiendaRoutes = [
  "cart",
  "checkout",
  "producto",
  "productos",
  "combos",
  "productos-destacados",
  "categorias",
];

function normalizeHost(hostname: string) {
  return hostname.replace(/^www\./, "").toLowerCase().trim();
}

function isLocalHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  );
}

function getSubdomainFromHost(hostname: string) {
  const host = normalizeHost(hostname);

  if (!host.endsWith(`.${PLATFORM_DOMAIN}`)) return null;

  const subdomain = host.replace(`.${PLATFORM_DOMAIN}`, "").trim();

  if (!subdomain || subdomain === "www") return null;

  return subdomain;
}

export function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  function setCurrentStore(newStore: Store) {
    localStorage.setItem("saas-current-store", JSON.stringify(newStore));
    setStore(newStore);
  }

  function clearCurrentStore() {
    localStorage.removeItem("saas-current-store");
    setStore(null);
  }

  useEffect(() => {
    let mounted = true;

    async function finish(currentStore: Store | null) {
      if (!mounted) return;

      setStore(currentStore);
      setLoading(false);
    }

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
            await finish(parsedStore);
            return;
          } catch {
            localStorage.removeItem("saas-current-store");
          }
        }

        await finish(null);
        return;
      }

      /* ===============================================
         DOMINIO / SUBDOMINIO

         - aguilacubaexpress.com -> domain en stores.
         - dlracing.perlamarketplace.com -> subdomain en stores.
      =============================================== */

      if (typeof window !== "undefined") {
        const rawHost = window.location.hostname.toLowerCase();
        const cleanHost = normalizeHost(rawHost);

        if (!isLocalHost(cleanHost)) {
          const subdomain = getSubdomainFromHost(cleanHost);

          if (subdomain) {
            const storeBySubdomain = await getStoreBySubdomain(subdomain);

            if (storeBySubdomain) {
              await finish(storeBySubdomain);
              return;
            }
          }

          if (cleanHost !== PLATFORM_DOMAIN) {
            const storeByDomain = await getStoreByDomain(cleanHost);

            if (storeByDomain) {
              await finish(storeByDomain);
              return;
            }
          }
        }
      }

      /* ===============================================
         /tienda/[slug]
      =============================================== */

      if (isTiendaRoute) {
        const parts = pathname.split("/").filter(Boolean);
        const possibleSlug = parts[1];

        if (possibleSlug && !reservedTiendaRoutes.includes(possibleSlug)) {
          const storeBySlug = await getStoreBySlug(possibleSlug);

          if (storeBySlug) {
            await finish(storeBySlug);
            return;
          }
        }
      }

      /* ===============================================
         TIENDA PÚBLICA DEFAULT

         Esto queda solo para /tienda mientras Águila siga
         siendo la tienda principal pública.
      =============================================== */

      if (isTiendaRoute) {
        const defaultStoreResult = await getDefaultStore();
        const data = defaultStoreResult?.data ?? null;
        await finish((data as Store) || null);
        return;
      }

      await finish(null);
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
