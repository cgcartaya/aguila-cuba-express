"use client";

/* =========================================================
   PÁGINA - TODOS LOS PRODUCTOS
   Vista completa de productos destacados / tienda
========================================================= */

import { useEffect, useState } from "react";
import { getStoreProducts } from "@/lib/services/products";

import ProductCard from "@/components/tienda/ProductCard";
import ProductSearch from "@/components/tienda/ProductSearch";

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

export default function TiendaProductosPage() {
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

  return (
    <section className="pt-5">
      <div className="mb-4">
        <h1 className="text-3xl font-black text-[#061b3a]">
          Todos los productos
        </h1>

        <p className="mt-1 text-sm font-semibold text-slate-500">
          Explora todos los productos disponibles para enviar a Cuba.
        </p>
      </div>

      <ProductSearch busqueda={busqueda} setBusqueda={setBusqueda} />

      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {productosBuscados.map((producto) => (
          <ProductCard
            key={producto.id}
            product={producto}
            onAddToCart={addToCart}
          />
        ))}
      </div>
    </section>
  );
}