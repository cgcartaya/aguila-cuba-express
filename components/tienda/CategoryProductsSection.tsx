"use client";

/* =========================================================
   CATEGORY PRODUCTS SECTION

   Muestra una categoría dentro de la tienda principal.

   Nuevo comportamiento:
   - Muestra solo los primeros productos.
   - Permite navegar a la categoría completa.
========================================================= */

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import ProductCard from "./ProductCard";

import type { Product } from "@/types/cart";

type Props = {
  title: string;
  products: Product[];
  onAddToCart: (product: Product) => void;
};

export default function CategoryProductsSection({
  title,
  products,
  onAddToCart,
}: Props) {
  if (products.length === 0) return null;

  // ======================================================
  // HOME: MOSTRAR SOLO LOS PRIMEROS 4 PRODUCTOS
  // ======================================================
  const previewProducts = products.slice(0, 4);

  // ======================================================
  // URL SEGURA PARA LA CATEGORÍA
  // ======================================================
  const categorySlug = encodeURIComponent(
    title.toLowerCase()
  );

  return (
    <section
      id={title}
      className="scroll-mt-[170px] py-6"
    >
      {/* CABECERA */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-3xl font-black text-[#061b3a]">
          {title}
        </h2>

        <Link
          href={`/tienda/categorias/${categorySlug}`}
          className="flex items-center gap-2 text-sm font-bold text-red-600 hover:text-red-700"
        >
          Ver todos

          <ArrowRight size={18} />
        </Link>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {previewProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </section>
  );
}