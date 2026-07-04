"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"

import { usePathname } from "next/navigation"

import type { Store } from "@/lib/saas/store-types"

import {
  getDefaultStore,
  getStoreBySlug,
} from "@/lib/services/stores"

type StoreContextValue = {
  store: Store | null
  loading: boolean
  setCurrentStore: (store: Store) => void
}

const StoreContext = createContext<StoreContextValue>({
  store: null,
  loading: true,
  setCurrentStore: () => {},
})

const reservedTiendaRoutes = [
  "cart",
  "producto",
  "combos",
  "productos-destacados",
]

export function StoreProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const [store, setStore] = useState<Store | null>(null)
  const [loading, setLoading] = useState(true)

  function setCurrentStore(newStore: Store) {
    localStorage.setItem(
      "saas-current-store",
      JSON.stringify(newStore)
    )

    setStore(newStore)
  }

  useEffect(() => {
    async function loadStore() {
      setLoading(true)

      const isAdminRoute = pathname.startsWith("/admin")
      const isTiendaRoute = pathname.startsWith("/tienda")

      /* ===============================================
         ADMIN ? usa localStorage
      =============================================== */

      if (isAdminRoute) {
        const savedStore = localStorage.getItem(
          "saas-current-store"
        )

        if (savedStore) {
          setStore(JSON.parse(savedStore))
          setLoading(false)
          return
        }
      }

      /* ===============================================
         /tienda/[slug]
      =============================================== */

      if (isTiendaRoute) {
        const parts = pathname.split("/").filter(Boolean)

        const possibleSlug = parts[1]

        if (
          possibleSlug &&
          !reservedTiendaRoutes.includes(possibleSlug)
        ) {
          const storeBySlug =
            await getStoreBySlug(possibleSlug)

          if (storeBySlug) {
            setStore(storeBySlug)
            setLoading(false)
            return
          }
        }
      }

      /* ===============================================
         FALLBACK

         /tienda
         producción actual de Águila
      =============================================== */

      const defaultStoreResult = await getDefaultStore()
      const data = defaultStoreResult?.data ?? null

      setStore((data as Store) || null)

      setLoading(false)
    }

    loadStore()
  }, [pathname])

  return (
    <StoreContext.Provider
      value={{
        store,
        loading,
        setCurrentStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  return useContext(StoreContext)
}