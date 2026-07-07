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
import { productMatchesSearch } from "@/lib/utils/search";
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

  /* =========================================================
     NORMALIZAR TEXTO
     Elimina tildes y convierte a minúsculas
  ========================================================= */

  const normalizarTexto = (texto: string = "") =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  /* =========================================================
     CARGAR PRODUCTOS
  ========================================================= */

  useEffect(() => {
    const cargarProductos = async () => {
      setLoading(true);

      const { data, error } = await getStoreProducts();

      if (error) {
        setLoading(false);
        return;
      }

      const productosConImagenPrincipal =
        (data as ProductFromSupabase[])?.map((producto) => {
          const imagenPrincipal =
            producto.product_images?.find(
              (img) => img.is_main
            ) ||
            producto.product_images
              ?.slice()
              .sort(
                (a, b) =>
                  (a.position ?? 0) - (b.position ?? 0)
              )[0];

          return {
            ...producto,
            image_url:
              imagenPrincipal?.image_url ||
              producto.image_url,
          };
        }) || [];

      setProductos(productosConImagenPrincipal);
      setLoading(false);
    };

    cargarProductos();
  }, []);

  /* =========================================================
     FILTRAR PRODUCTOS
  ========================================================= */

  const productosFiltrados = useMemo(() => {
    return productos.filter((producto) => {
      const mismaCategoria =
        normalizarTexto(producto.category) ===
        normalizarTexto(categoryName);

      const coincideBusqueda =
  productMatchesSearch(producto, busqueda);

      return mismaCategoria && coincideBusqueda;
    });
  }, [productos, categoryName, busqueda]);

  return (
    <main className="pb-28">
      {/* =====================================================
          CABECERA
      ===================================================== */}

      <div className="px-4 pt-5">
        {/* =====================================================
            BOTÓN VOLVER A LA TIENDA
        ===================================================== */}

        <div className="mb-6">
          <Link
            href="/tienda"
            className="
              inline-flex
              items-center
              gap-3
              rounded-2xl
              border
              border-slate-200
              bg-white
              px-5
              py-3
              shadow-sm
              transition-all
              duration-300
              hover:-translate-y-0.5
              hover:border-[#2563eb]
              hover:shadow-md
            "
          >
            <div
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-blue-50
                text-[#2563eb]
              "
            >
              <ArrowLeft size={20} />
            </div>

            <div className="text-left">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Navegación
              </p>

              <p className="font-black text-[#061b3a]">
                Volver a la tienda
              </p>
            </div>
          </Link>
        </div>

        {/* =====================================================
            TÍTULO DE CATEGORÍA
        ===================================================== */}

        <h1 className="text-4xl font-black capitalize text-[#061b3a]">
          {categoryName}
        </h1>

        <p className="mt-2 text-sm font-medium text-slate-500">
          Todos los productos disponibles en esta categoría.
        </p>
      </div>

      {/* =====================================================
          BUSCADOR
      ===================================================== */}

      <ProductSearch
        busqueda={busqueda}
        setBusqueda={setBusqueda}
      />

      {/* =====================================================
          PRODUCTOS
      ===================================================== */}

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
          <div
            className="
              rounded-2xl border border-dashed
              border-slate-300 bg-white p-8
              text-center
            "
          >
            <h2 className="text-xl font-black text-[#061b3a]">
              No hay productos disponibles
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              No encontramos productos activos para esta
              categoría.
            </p>
          </div>
        )}
      </section>

      {/* =====================================================
          BOTÓN INFERIOR
      ===================================================== */}

      <div className="mt-10 flex justify-center px-4">
        <Link
          href="/tienda"
          className="
            rounded-full
            bg-[#061b3a]
            px-8
            py-3
            text-sm
            font-bold
            text-white
            transition
            hover:bg-[#0d2b57]
          "
        >
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}