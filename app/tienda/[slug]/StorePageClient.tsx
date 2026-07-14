"use client";

/* =========================================================
   PÁGINA PRINCIPAL - TIENDA POR SLUG

   - Header y categorías sticky viven en layout.
   - La página solo controla el contenido:
     Banner → Categorías/cuadrículas → Combos → Productos.
   - Search V2 con resultados planos.
   - HelpCard usa la Configuración General de la tienda.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { productMatchesSearch } from "@/lib/utils/search";
import { getStoreProductsByStoreId } from "@/lib/services/products";
import {
  getActiveCategoriesByStoreId,
  getStoreSettings,
} from "@/lib/services/settings";
import { getStoreBySlug } from "@/lib/services/stores";

import MainBanner from "@/components/tienda/MainBanner";
import StoreCombosSection from "@/components/tienda/combos/StoreCombosSection";
import CategoryProductsSection from "@/components/tienda/CategoryProductsSection";
import DeliveryBanner from "@/components/tienda/DeliveryBanner";
import HelpCard from "@/components/tienda/HelpCard";
import CategoriesShowcaseCarousel from "@/components/tienda/CategoriesShowcaseCarousel";
import SearchResultsSection from "@/components/tienda/search/SearchResultsSection";
import VisitTracker from "@/components/analytics/VisitTracker";

import { useCart } from "@/contexts/CartContext";
import { useTiendaSearch } from "@/components/tienda/search/TiendaSearchContext";
import type { Product } from "@/types/cart";
import type {
  Category,
  StoreSettings,
} from "@/components/admin/settings/types";
import type { Store } from "@/lib/saas/store-types";

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type ProductFromSupabase = Product & {
  product_images?: ProductImage[] | null;
};

export default function StoreSlugTiendaPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [productos, setProductos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [storeLoaded, setStoreLoaded] = useState(false);

  const { search } = useTiendaSearch();
  const { addToCart } = useCart();

  const busqueda = search.trim();
  const hayBusqueda = busqueda.length > 0;

  useEffect(() => {
    let mounted = true;

    async function cargarDatos() {
      if (!slug) return;

      setStoreLoaded(false);

      const currentStore = await getStoreBySlug(slug);

      if (!mounted) return;

      if (!currentStore) {
        setProductos([]);
        setCategorias([]);
        setStoreId(null);
        setStore(null);
        setStoreSettings(null);
        setStoreLoaded(true);
        return;
      }

      setStore(currentStore);
      setStoreId(currentStore.id);

      const [
        { data: productsData, error },
        { data: categoriesData },
        { data: settingsData },
      ] = await Promise.all([
        getStoreProductsByStoreId(currentStore.id),
        getActiveCategoriesByStoreId(currentStore.id),
        getStoreSettings(currentStore.id),
      ]);

      if (!mounted) return;

      if (error) {
        console.error("Error cargando productos:", error);
      }

      const productosConImagenPrincipal =
        ((productsData || []) as ProductFromSupabase[]).map((producto) => {
          const imagenPrincipal =
            producto.product_images?.find((img) => img.is_main) ||
            producto.product_images
              ?.slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

          return {
            ...producto,
            image_url: imagenPrincipal?.image_url || producto.image_url,
          };
        }) || [];

      setProductos(productosConImagenPrincipal);
      setCategorias((categoriesData as Category[]) || []);
      setStoreSettings((settingsData as StoreSettings) || null);
      setStoreLoaded(true);
    }

    cargarDatos();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const productosBuscados = useMemo(() => {
    if (!hayBusqueda) return productos;

    return productos.filter((producto) =>
      productMatchesSearch(producto, busqueda)
    );
  }, [productos, busqueda, hayBusqueda]);

  const productosPorCategoria = useMemo(() => {
    return categorias
      .map((categoria) => ({
        categoria: categoria.name,
        color: categoria.color,
        productos: productos.filter(
          (producto) => producto.category === categoria.name
        ),
      }))
      .filter((grupo) => grupo.productos.length > 0);
  }, [categorias, productos]);

  return (
    <>
      <VisitTracker storeId={storeId} pageType="store" />
    <main className="min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {hayBusqueda ? (
        <SearchResultsSection
          products={productosBuscados}
          onAddToCart={addToCart}
        />
      ) : (
        <>
          <div className="mt-4 md:mt-5">
            {storeLoaded && storeId && (
              <MainBanner storeId={storeId} storeSlug={slug} />
            )}
          </div>

          <CategoriesShowcaseCarousel
            groups={productosPorCategoria}
            storeSlug={slug}
          />

          <div className="-mt-2 md:-mt-3">
            {storeLoaded && storeId && (
              <StoreCombosSection storeId={storeId} storeSlug={slug} />
            )}
          </div>

          <div className="mt-2">
            {productosPorCategoria.map((grupo) => (
              <CategoryProductsSection
                key={grupo.categoria}
                title={grupo.categoria}
                products={grupo.productos}
                onAddToCart={addToCart}
                storeSlug={slug}
              />
            ))}
          </div>

          <DeliveryBanner />
          <HelpCard
            storeName={storeSettings?.store_name || store?.name}
            whatsapp={storeSettings?.whatsapp || storeSettings?.phone || store?.client_phone}
          />
        </>
      )}
    </main>
    </>
  );
}
