"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"

import { productMatchesSearch } from "@/lib/utils/search"
import { getStoreBySlug } from "@/lib/services/stores"
import { getStoreProductsByStoreId } from "@/lib/services/products"
import { getActiveCategoriesByStoreId } from "@/lib/services/settings"

import ProductSearch from "@/components/tienda/ProductSearch"
import StoreCombosSection from "@/components/tienda/combos/StoreCombosSection"
import StickyCategoryTabs from "@/components/tienda/StickyCategoryTabs"
import CategoryProductsSection from "@/components/tienda/CategoryProductsSection"
import DeliveryBanner from "@/components/tienda/DeliveryBanner"
import HelpCard from "@/components/tienda/HelpCard"
import CategoriesShowcaseCarousel from "@/components/tienda/CategoriesShowcaseCarousel"

import { useCart } from "@/contexts/CartContext"

import type { Product } from "@/types/cart"
import type { Category } from "@/components/admin/settings/types"

type ProductImage = {
  image_url: string
  is_main: boolean
  position: number | null
}

type ProductFromSupabase = Product & {
  product_images?: ProductImage[]
}

export default function StoreSlugPage() {
  const params = useParams()
  const slug = params.slug as string

  const [busqueda, setBusqueda] = useState("")
  const [productos, setProductos] = useState<Product[]>([])
  const [categorias, setCategorias] = useState<Category[]>([])
  const [storeId, setStoreId] = useState<string>("")
  const [loading, setLoading] = useState(true)

  const { addToCart } = useCart()

  const hayBusqueda = busqueda.trim().length > 0

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true)

      const store = await getStoreBySlug(slug)

      setStoreId(store?.id || "")

      if (!store) {
        setProductos([])
        setCategorias([])
        setLoading(false)
        return
      }

      const [{ data: productsData, error }, { data: categoriesData }] =
        await Promise.all([
          getStoreProductsByStoreId(store.id),
          getActiveCategoriesByStoreId(store.id),
        ])

      if (error) {
        console.error("Error cargando productos:", error)
      }

      const productosConImagenPrincipal =
        (productsData as ProductFromSupabase[])?.map((producto) => {
          const imagenPrincipal =
            producto.product_images?.find((img) => img.is_main) ||
            producto.product_images
              ?.slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0]

          return {
            ...producto,
            image_url: imagenPrincipal?.image_url || producto.image_url,
          }
        }) || []

      setProductos(productosConImagenPrincipal)
      setCategorias(categoriesData || [])
      setLoading(false)
    }

    cargarDatos()
  }, [slug])

  const productosBuscados = useMemo(() => {
    return productos.filter((producto) =>
      productMatchesSearch(producto, busqueda)
    )
  }, [productos, busqueda])

  const categoriasConCombos = useMemo(() => {
    return [
      {
        name: "Combos",
        color: "#061b3a",
      },
      ...categorias.map((categoria) => ({
        name: categoria.name,
        color: categoria.color,
      })),
    ]
  }, [categorias])

  const productosPorCategoria = useMemo(() => {
    const grupos = categorias.map((categoria) => ({
      categoria: categoria.name,
      color: categoria.color,
      productos: productosBuscados.filter(
        (producto) => producto.category === categoria.name
      ),
    }))

    if (hayBusqueda) {
      return grupos.filter((grupo) => grupo.productos.length > 0)
    }

    return grupos
  }, [categorias, productosBuscados, hayBusqueda])

  if (loading) {
    return (
      <main className="min-h-[100dvh] p-8 text-center text-slate-500">
        Cargando tienda...
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <ProductSearch busqueda={busqueda} setBusqueda={setBusqueda} />

         {!hayBusqueda && (
        <CategoriesShowcaseCarousel groups={productosPorCategoria} />
      )}

      {!hayBusqueda && categoriasConCombos.length > 0 && (
        <StickyCategoryTabs categories={categoriasConCombos} />
      )}

      {!hayBusqueda && (
  <StoreCombosSection storeId={storeId} />
)}

      <div className="mt-2">
        {productosPorCategoria.map((grupo) => (
          <CategoryProductsSection
            key={grupo.categoria}
            title={grupo.categoria}
            products={grupo.productos}
            onAddToCart={addToCart}
          />
        ))}
      </div>

      {hayBusqueda && productosBuscados.length === 0 && (
        <div className="mx-4 my-10 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-xl font-black text-[#061b3a]">
            No encontramos productos
          </h3>

          <p className="mt-2 text-slate-500">
            Intenta buscar con otro nombre o revisa la categoría.
          </p>
        </div>
      )}

      {!hayBusqueda && <DeliveryBanner />}

      {!hayBusqueda && <HelpCard />}
    </main>
  )
}