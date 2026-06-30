"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"

import { getStores } from "@/lib/services/stores"
import { useStore } from "@/contexts/StoreContext"

import type { Store } from "@/lib/saas/store-types"

export default function StoreSwitcher() {
  const router = useRouter()

  const { store, setCurrentStore } = useStore()

  const [stores, setStores] = useState<Store[]>([])

  useEffect(() => {
    async function loadStores() {
      const data = await getStores()
      setStores(data)
    }

    loadStores()
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLSelectElement>
  ) {
    const selectedStore = stores.find(
      (s) => s.id === e.target.value
    )

    if (!selectedStore) return

    // Guardamos la tienda seleccionada
    setCurrentStore(selectedStore)

    // Refrescamos toda la administración para
    // recargar productos, categorías, banners, etc.
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm">
      <Building2 className="h-5 w-5 text-slate-600" />

      <div className="flex flex-col">
        <span className="text-xs text-slate-500">
          Tienda activa
        </span>

        <select
          value={store?.id || ""}
          onChange={handleChange}
          className="bg-transparent font-semibold outline-none"
        >
          <option value="">
            Seleccionar tienda
          </option>

          {stores.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {item.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}