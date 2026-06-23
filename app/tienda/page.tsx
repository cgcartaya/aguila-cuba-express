"use client";

/* =========================================================
   PÁGINA PRINCIPAL - TIENDA PÚBLICA

   Nueva estructura tipo app moderna:

   - Buscador
   - Combos destacados
   - Categorías sticky
   - Productos agrupados por categoría
   - Banner envío
   - Ayuda
========================================================= */

import { useEffect, useMemo, useState } from "react";

import { getStoreProducts } from "@/lib/services/products";

import ProductSearch from "@/components/tienda/ProductSearch";
import StoreCombosSection from "@/components/tienda/combos/StoreCombosSection";
import StickyCategoryTabs from "@/components/tienda/StickyCategoryTabs";
import CategoryProductsSection from "@/components/tienda/CategoryProductsSection";
import DeliveryBanner from "@/components/tienda/DeliveryBanner";
import HelpCard from "@/components/tienda/HelpCard";

import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types/cart";

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

  const { addToCart } = useCart();

  useEffect(() => {
    const cargarProductos = async () => {
      const { data, error } = await getStoreProducts();

      if (error) {
        console.log("Error cargando productos:", error);
        return;
      }

      const productosConImagenPrincipal =
        (data as ProductFromSupabase[])?.map((producto) => {
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
    };

    cargarProductos();
  }, []);

  const productosBuscados = productos.filter((producto) =>
    producto.name.toLowerCase().includes(busqueda.toLowerCase())
  );

  const categorias = useMemo(() => {
    return Array.from(
      new Set(
        productosBuscados
          .map((producto) => producto.category)
          .filter(Boolean)
      )
    );
  }, [productosBuscados]);

  const productosPorCategoria = useMemo(() => {
    return categorias.map((categoria) => ({
      categoria,
      productos: productosBuscados.filter(
        (producto) => producto.category === categoria
      ),
    }));
  }, [categorias, productosBuscados]);

  return (
    <>
      {/* BUSCADOR */}
      <ProductSearch
        busqueda={busqueda}
        setBusqueda={setBusqueda}
      />

      {/* COMBOS */}
      <StoreCombosSection />

      {/* CATEGORÍAS STICKY */}
      {categorias.length > 0 && (
        <StickyCategoryTabs categories={categorias} />
      )}

      {/* PRODUCTOS AGRUPADOS */}
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

      {/* ENVÍOS */}
      <DeliveryBanner />

      {/* AYUDA */}
      <HelpCard />
    </>
  );
}