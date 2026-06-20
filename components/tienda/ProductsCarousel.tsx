"use client";

/* ==========================
   IMPORTS
========================== */

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import type { Product } from "@/types/cart";


/* ==========================
   PROPS DEL COMPONENTE
========================== */

type Props = {
  productos: Product[];
  agregarAlCarrito: (producto: Product) => void;
};


/* ==========================
   GRID DE PRODUCTOS
========================== */

export default function ProductsCarousel({
  productos,
  agregarAlCarrito,
}: Props) {

  /* ==========================
     ESTADO SIN RESULTADOS
  ========================== */

  if (productos.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500">
        No se encontraron productos.
      </div>
    );
  }


  return (
    <section className="mt-6">

      {/* TÍTULO */}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#061b3a]">
          Productos destacados
        </h2>
      </div>


      {/* LISTADO DE TARJETAS */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">

        {productos.map((producto) => (
          <article
            key={producto.id}
            className="
              rounded-2xl
              border
              bg-white
              p-3
              shadow-sm
              transition
              hover:shadow-md
            "
          >

            {/* ==========================
               ENLACE AL DETALLE DEL PRODUCTO
            ========================== */}

            <Link href={`/tienda/producto/${producto.id}`}>

              {/* IMAGEN PRINCIPAL */}

              <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl bg-gray-100">

          <Image
  src={producto.image_url || "/placeholder-product.png"}
  alt={producto.name}
  fill
  unoptimized
  className="object-cover"
/>

              </div>


              {/* NOMBRE */}

              <h3 className="line-clamp-2 font-semibold text-gray-900">
                {producto.name}
              </h3>

            </Link>


            {/* DESCRIPCIÓN */}

            {producto.description && (
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                {producto.description}
              </p>
            )}


            {/* PRECIO */}

            <p className="mt-2 text-lg font-black text-[#061b3a]">
              ${Number(producto.price).toFixed(2)}
            </p>


            {/* ETIQUETA PROMOCIONAL */}

            {producto.tag && (
              <span className="
                mt-2
                inline-block
                rounded-full
                bg-red-100
                px-2
                py-1
                text-xs
                font-semibold
                text-red-600
              ">
                {producto.tag}
              </span>
            )}


            {/* BOTÓN CARRITO */}

            <button
              onClick={() => agregarAlCarrito(producto)}
              className="
                mt-3
                flex
                w-full
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-black
                px-4
                py-2
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-gray-800
              "
            >
              <ShoppingCart size={16} />
              Agregar al carrito
            </button>

          </article>
        ))}

      </div>

    </section>
  );
}