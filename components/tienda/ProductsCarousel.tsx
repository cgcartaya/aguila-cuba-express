"use client";

import Image from "next/image";
import { ShoppingCart } from "lucide-react";

type Product = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  is_active: boolean;
  tag?: string | null;
};

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
      <div className="py-8 text-center text-gray-500">
        No se encontraron productos.
      </div>
    );
  }

  return (
    <section className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#061b3a]">
          Productos destacados
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {productos.map((producto) => (
          <div
            key={producto.id}
            className="rounded-2xl border bg-white p-3 shadow-sm transition hover:shadow-md"
          >
            <div className="relative mb-3 h-40 w-full overflow-hidden rounded-xl bg-gray-100">
              <Image
                src={producto.image_url}
                alt={producto.name}
                fill
                className="object-cover"
              />
            </div>

            <h3 className="line-clamp-2 font-semibold text-gray-900">
              {producto.name}
            </h3>

            <p className="mt-1 text-lg font-bold text-[#061b3a]">
              ${Number(producto.price).toFixed(2)}
            </p>

            {producto.tag && (
              <span className="mt-2 inline-block rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-600">
                {producto.tag}
              </span>
            )}

            <button
              onClick={() => agregarAlCarrito(producto)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              <ShoppingCart size={16} />
              Agregar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}