"use client";

/* =========================================================
   PÁGINA PRINCIPAL - TIENDA POR SLUG

   Search V2:
   - El buscador vive en Header.
   - La búsqueda usa TiendaSearchProvider, sin useSearchParams.
   - Al buscar, se muestran resultados planos y limpios.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { productMatchesSearch } from "@/lib/utils/search";
import { getStoreProductsByStoreId } from "@/lib/services/products";
import { getActiveCategoriesByStoreId } from "@/lib/services/settings";
import { getStoreBySlug } from "@/lib/services/stores";

import StoreCombosSection from "@/components/tienda/combos/StoreCombosSection";
import StickyCategoryTabs from "@/components/tienda/StickyCategoryTabs";
import CategoryProductsSection from "@/components/tienda/CategoryProductsSection";
import DeliveryBanner from "@/components/tienda/DeliveryBanner";
import HelpCard from "@/components/tienda/HelpCard";
import CategoriesShowcaseCarousel from "@/components/tienda/CategoriesShowcaseCarousel";
import SearchResultsSection from "@/components/tienda/search/SearchResultsSection";

import { useCart } from "@/contexts/CartContext";
import { useTiendaSearch } from "@/components/tienda/search/TiendaSearchContext";
import type { Product } from "@/types/cart";
import type { Category } from "@/components/admin/settings/types";

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

  const { search } = useTiendaSearch();
  const { addToCart } = useCart();

  const busqueda = search.trim();
  const hayBusqueda = busqueda.length > 0;

  useEffect(() => {
    let mounted = true;

    async function cargarDatos() {
      if (!slug) return;

      const store = await getStoreBySlug(slug);

      if (!mounted) return;

      if (!store) {
        setProductos([]);
        setCategorias([]);
        setStoreId(null);
        return;
      }

      setStoreId(store.id);

      const [{ data: productsData, error }, { data: categoriesData }] =
        await Promise.all([
          getStoreProductsByStoreId(store.id),
          getActiveCategoriesByStoreId(store.id),
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
    ];
  }, [categorias]);

  const productosPorCategoria = useMemo(() => {
    return categorias.map((categoria) => ({
      categoria: categoria.name,
      color: categoria.color,
      productos: productos.filter(
        (producto) => producto.category === categoria.name
      ),
    }));
  }, [categorias, productos]);

  return (
    <main className="min-h-[100dvh] pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {hayBusqueda ? (
        <SearchResultsSection
          products={productosBuscados}
          onAddToCart={addToCart}
        />
      ) : (
        <>
          <CategoriesShowcaseCarousel groups={productosPorCategoria} />

          {categoriasConCombos.length > 0 && (
            <StickyCategoryTabs categories={categoriasConCombos} />
          )}

          <StoreCombosSection storeId={storeId || undefined} />

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

          <DeliveryBanner />
          <HelpCard />
        </>
      )}
    </main>
  );
}
