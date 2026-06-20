"use client";

/* =========================================================
   PRODUCTS CAROUSEL / GRID
   Muestra los productos destacados de la tienda pública
========================================================= */

import ProductCard from "./ProductCard";
import type { Product } from "@/types/cart";

type Props = {
  productos: Product[];
  agregarAlCarrito: (producto: Product) => void;
};

export default function ProductsCarousel({
  productos,
  agregarAlCarrito,
}: Props) {
  if (productos.length === 0) {
    return (
      <div className="py-8 text-center text-sm font-semibold text-slate-500">
        No se encontraron productos.
      </div>
    );
  }

  return (
    <section className="mt-8">
      {/* HEADER DE SECCIÓN */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-black text-[#061b3a]">
          Productos destacados
        </h2>

        <button className="text-sm font-black text-[#061b3a]">
          Ver todas ❯
        </button>
      </div>

      {/* GRID PROFESIONAL */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {productos.map((producto) => (
          <ProductCard
            key={producto.id}
            product={producto}
            onAddToCart={agregarAlCarrito}
          />
        ))}
      </div>
    </section>
  );
}