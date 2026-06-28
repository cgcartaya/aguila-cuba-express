"use client";

/* =========================================================
   PÁGINA PRINCIPAL - TIENDA PÚBLICA

   Categorías 100% dinámicas:
   - Se cargan desde Supabase.
   - Se ordenan por sort_order.
   - Respetan is_active.
   - Usan color configurado desde Admin.
   - Aparecen en sticky aunque todavía no tengan productos.
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { productMatchesSearch } from "@/lib/utils/search";
import { getStoreProducts } from "@/lib/services/products";
import { getActiveCategories } from "@/lib/services/settings";

import ProductSearch from "@/components/tienda/ProductSearch";
import StoreCombosSection from "@/components/tienda/combos/StoreCombosSection";
import StickyCategoryTabs from "@/components/tienda/StickyCategoryTabs";
import CategoryProductsSection from "@/components/tienda/CategoryProductsSection";
import DeliveryBanner from "@/components/tienda/DeliveryBanner";
import HelpCard from "@/components/tienda/HelpCard";
import CategoriesShowcaseCarousel from "@/components/tienda/CategoriesShowcaseCarousel";

import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types/cart";
import type { Category } from "@/components/admin/settings/types";

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type ProductFromSupabase = Product & {
  product_images?: ProductImage[];
};

export default function TiendaPage() {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Product[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);

  const { addToCart } = useCart();

  useEffect(() => {
    async function cargarDatos() {
      const [{ data: productsData, error }, { data: categoriesData }] =
        await Promise.all([getStoreProducts(), getActiveCategories()]);

      if (error) {
        console.log("Error cargando productos:", error);
      }

      const productosConImagenPrincipal =
        (productsData as ProductFromSupabase[])?.map((producto) => {
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
      setCategorias(categoriesData || []);
    }

    cargarDatos();
  }, []);

const productosBuscados = productos.filter((producto) =>
  productMatchesSearch(producto, busqueda)
);

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
      productos: productosBuscados.filter(
        (producto) => producto.category === categoria.name
      ),
    }));
  }, [categorias, productosBuscados]);

  return (
    <>
      <ProductSearch busqueda={busqueda} setBusqueda={setBusqueda} />

      <CategoriesShowcaseCarousel groups={productosPorCategoria} />

      {categoriasConCombos.length > 0 && (
        <StickyCategoryTabs categories={categoriasConCombos} />
      )}

      <StoreCombosSection />

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
  );
}