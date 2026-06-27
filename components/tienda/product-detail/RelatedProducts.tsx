"use client";

/* =========================================================
   RELATED PRODUCTS

   Muestra productos relacionados en la página de detalle.

   IMPORTANTE:
   - Soporta productos con imagen antigua en products.image_url.
   - Soporta productos nuevos con imágenes en product_images.
   - Usa imagen principal si existe.
========================================================= */

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/types/cart";

/* =========================================================
   TYPES
========================================================= */

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position?: number | null;
};

type RelatedProduct = Product & {
  product_images?: ProductImage[];
};

type RelatedProductsProps = {
  products: RelatedProduct[];
};

/* =========================================================
   COMPONENT
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
        {products.map((item) => {
          const orderedImages =
            item.product_images
              ?.slice()
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) || [];

          const mainImage =
            orderedImages.find((img) => img.is_main)?.image_url ||
            orderedImages[0]?.image_url ||
            item.image_url ||
            "/placeholder-product.png";

          return (
            <Link
              key={item.id}
              href={`/tienda/producto/${item.id}`}
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-3
                shadow-sm
                transition
                hover:shadow-md
              "
            >
              <div className="relative h-36 overflow-hidden rounded-xl bg-slate-100">
                <Image
                  src={mainImage}
                  alt={item.name}
                  fill
                  unoptimized
                  className="object-contain p-2"
                />
              </div>

              <h3 className="mt-3 line-clamp-2 text-sm font-bold text-[#061b3a]">
                {item.name}
              </h3>

              <p className="mt-1 font-black text-red-600">
                ${Number(item.price).toFixed(2)}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}