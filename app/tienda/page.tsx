"use client";

/* =========================================================
   PÁGINA PRINCIPAL - TIENDA PÚBLICA - HOME V5

   - Header y categorías sticky viven en layout.
   - La página solo controla el contenido:
     Banner → Categorías/cuadrículas → Combos → Productos.
   - Search V2 con resultados planos.
   - HelpCard usa la Configuración General de la tienda.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { searchProducts } from "@/lib/utils/search";
import { getStoreProductsByStoreId } from "@/lib/services/products";
import {
  getPublicActiveCategoriesByStoreId as getActiveCategoriesByStoreId,
  getPublicStoreSettings as getStoreSettings,
} from "@/lib/services/settings";
import { useStore } from "@/hooks/useStore";

import RestaurantEntry from "@/components/restaurant/RestaurantEntry";
import MainBanner from "@/components/tienda/MainBanner";
import StoreCombosSection from "@/components/tienda/combos/StoreCombosSection";
import CategoryProductsSection from "@/components/tienda/CategoryProductsSection";
import DeliveryBanner from "@/components/tienda/DeliveryBanner";
import HelpCard from "@/components/tienda/HelpCard";
import CategoriesShowcaseCarousel from "@/components/tienda/CategoriesShowcaseCarousel";
import HomeFeaturedProducts from "@/components/tienda/HomeFeaturedProducts";
import SearchResultsSection from "@/components/tienda/search/SearchResultsSection";
import { useCart } from "@/contexts/CartContext";
import { useTiendaSearch } from "@/components/tienda/search/TiendaSearchContext";
import type { Product } from "@/types/cart";
import type {
  Category,
  StoreSettings,
} from "@/components/admin/settings/types";

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type ProductFromSupabase = Product & {
  product_images?: ProductImage[] | null;
};

export default function TiendaPage() {
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [productos, setProductos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);

  const { search } = useTiendaSearch();
  const { addToCart } = useCart();
  const { store, loading: storeLoading } = useStore();

  const busqueda = search.trim();
  const hayBusqueda = busqueda.length > 0;

  // Los campos son opcionales para mantener compatibilidad con tiendas
  // que todavía no hayan ejecutado la migración. Solo "false" oculta.
  const sectionEnabled = (value: boolean | null | undefined) => value !== false;

  useEffect(() => {
    let mounted = true;

    async function cargarDatos() {
      if (storeLoading) return;

      const currentStore = store;

      if (!mounted) return;

      if (!currentStore) {
        setProductos([]);
        setCategorias([]);
        setStoreSettings(null);
        return;
      }

      const [
        { data: productsData, error },
        { data: categoriesData, error: categoriesError },
        { data: settingsData, error: settingsError },
      ] = await Promise.all([
        getStoreProductsByStoreId(currentStore.id),
        getActiveCategoriesByStoreId(currentStore.id),
        getStoreSettings(currentStore.id),
      ]);

      if (!mounted) return;

      if (error || categoriesError || settingsError) {
        console.error("Error cargando catálogo:", error || categoriesError || settingsError);
        setLoadError(true);
        return;
      }
      setLoadError(false);

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
    }

    cargarDatos();

    return () => {
      mounted = false;
    };
  }, [store?.id, storeLoading, retry]);

  const productosBuscados = useMemo(() => {
    if (!hayBusqueda) return productos;

    return searchProducts(productos, busqueda);
  }, [productos, busqueda, hayBusqueda]);

  const productosDestacados = useMemo(() => {
    return productos
      .filter((producto) => producto.is_home_featured)
      .sort((a, b) => {
        const orderA = a.home_featured_order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.home_featured_order ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
  }, [productos]);

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
      
    <main className="min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {loadError && (
        <div role="alert" className="mx-auto my-6 max-w-3xl rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
          <p>No pudimos cargar el catálogo. Comprueba tu conexión e inténtalo de nuevo.</p>
          <button type="button" className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold" onClick={() => { setLoadError(false); setRetry((value) => value + 1); }}>Reintentar carga</button>
        </div>
      )}
      {hayBusqueda ? (
        <SearchResultsSection
          products={productosBuscados}
          onAddToCart={addToCart}
        />
      ) : (
        <>
          <RestaurantEntry storeSlug={store?.slug} />
          {sectionEnabled(storeSettings?.show_hero) && (
            <div className="mt-4 md:mt-5">
              <MainBanner storeId={store?.id || undefined} />
            </div>
          )}

          {sectionEnabled(storeSettings?.show_featured_products) && (
            <HomeFeaturedProducts
              products={productosDestacados}
              onAddToCart={addToCart}
            />
          )}

          {sectionEnabled(storeSettings?.show_categories) && (
            <CategoriesShowcaseCarousel groups={productosPorCategoria} />
          )}

          {sectionEnabled(storeSettings?.show_combos) && (
            <div className="-mt-2 md:-mt-3">
              <StoreCombosSection
                storeId={store?.id || undefined}
              />
            </div>
          )}

          {sectionEnabled(storeSettings?.show_products) && (
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
          )}

          {sectionEnabled(storeSettings?.show_delivery_banner) && (
            <DeliveryBanner />
          )}

          {sectionEnabled(storeSettings?.show_help_card) && (
            <HelpCard
              storeName={storeSettings?.store_name || store?.name}
              whatsapp={
                storeSettings?.whatsapp ||
                storeSettings?.phone ||
                store?.client_phone
              }
            />
          )}
        </>
      )}
    </main>
    </>
  );
}
