"use client";

/* =========================================================
   PÁGINA INDIVIDUAL DE CATEGORÍA

   Ruta:
   /tienda/categorias/[category]

   Objetivo:
   Mostrar todos los productos de una categoría específica
   con una arquitectura preparada para escalar.
========================================================= */

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getStoreProducts } from "@/lib/services/products";
import ProductCard from "@/components/tienda/ProductCard";
import ProductSearch from "@/components/tienda/ProductSearch";

import { useCart } from "@/contexts/CartContext";
import type { Product } from "@/types/cart";

type Props = {
  params: Promise<{
    category: string;
  }>;
};

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type ProductFromSupabase = Product & {
  product_images?: ProductImage[];
};

export default function CategoryPage({ params }: Props) {
  const { addToCart } = useCart();

  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

const { category } = use(params);

const categoryName = decodeURIComponent(category);

  useEffect(() => {
    const cargarProductos = async () => {
      setLoading(true);

      const { data, error } = await getStoreProducts();

      if (error) {
        console.log("Error cargando productos por categoría:", error);
        setLoading(false);
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
      setLoading(false);
    };

    cargarProductos();
  }, []);

  const productosFiltrados = useMemo(() => {
    return productos.filter((producto) => {
      const mismaCategoria =
        producto.category?.toLowerCase() === categoryName.toLowerCase();

      const coincideBusqueda = producto.name
        .toLowerCase()
        .includes(busqueda.toLowerCase());

      return mismaCategoria && coincideBusqueda;
    });
  }, [productos, categoryName, busqueda]);

  return (
    <main className="pb-28">
      <div className="px-4 pt-5">
        <Link
          href="/tienda"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500"
        >
          <ArrowLeft size={18} />
          Volver a tienda
        </Link>

        <h1 className="text-4xl font-black capitalize text-[#061b3a]">
          {categoryName}
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">
          Todos los productos disponibles en esta categoría.
        </p>
      </div>

      <ProductSearch
        busqueda={busqueda}
        setBusqueda={setBusqueda}
      />

      <section className="px-4">
        {loading ? (
          <p className="py-10 text-center text-sm font-semibold text-slate-500">
            Cargando productos...
          </p>
        ) : productosFiltrados.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {productosFiltrados.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="text-xl font-black text-[#061b3a]">
              No hay productos disponibles
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              No encontramos productos activos para esta categoría.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}