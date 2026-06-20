"use client";

/* =========================================================
   IMPORTS
========================================================= */

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/cart";

/* =========================================================
   TYPES
========================================================= */

type RelatedProductsProps = {
  products: Product[];
};

/* =========================================================
   RELATED PRODUCTS
========================================================= */

export default function RelatedProducts({
  products,
}: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-black">
        Productos relacionados
      </h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {products.map((item) => (
          <Link
            key={item.id}
            href={`/tienda/producto/${item.id}`}
            className="rounded-2xl border bg-white p-3 shadow-sm transition hover:shadow-md"
          >
            <div className="relative h-36 rounded-xl bg-slate-100">
              <Image
                src={item.image_url || "/placeholder-product.png"}
                alt={item.name}
                fill
                unoptimized
                className="object-contain p-2"
              />
            </div>

            <h3 className="mt-3 line-clamp-2 text-sm font-bold">
              {item.name}
            </h3>

            <p className="mt-1 font-black text-red-600">
              ${Number(item.price).toFixed(2)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}