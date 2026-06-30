"use client";

/* =========================================================
   RELATED PRODUCTS
   Mantiene el contexto de tienda multiempresa.
========================================================= */

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";
import type { Product } from "@/types/cart";

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

export default function RelatedProducts({
  products,
}: RelatedProductsProps) {
  const { addToCart } = useCart();
  const { store } = useStore();

  if (products.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-black text-[#061b3a]">
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

          const outOfStock = Number(item.stock || 0) <= 0;

const isDefaultStore = store?.slug === "aguila";

const productUrl =
  store?.slug && !isDefaultStore
    ? `/tienda/${store.slug}/producto/${item.id}`
    : `/tienda/producto/${item.id}`;

          return (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md"
            >
              <Link href={productUrl}>
                <div className="relative h-36 overflow-hidden rounded-xl bg-slate-100">
                  <Image
                    src={mainImage}
                    alt={item.name}
                    fill
                    unoptimized
                    className="object-contain p-2"
                  />
                </div>
              </Link>

              <Link href={productUrl}>
                <h3 className="mt-3 line-clamp-2 min-h-[40px] text-sm font-bold text-[#061b3a]">
                  {item.name}
                </h3>
              </Link>

              <p className="mt-1 font-black text-red-600">
                ${Number(item.price).toFixed(2)}
              </p>

              <div className="mt-3 space-y-2">
                <Link
                  href={productUrl}
                  className="block w-full rounded-xl border border-slate-200 py-2 text-center text-sm font-bold text-[#061b3a] transition hover:bg-slate-50"
                >
                  Ver producto
                </Link>

                {outOfStock ? (
                  <button
                    disabled
                    className="w-full rounded-xl bg-slate-300 py-2 text-sm font-bold text-white"
                  >
                    Agotado
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    <ShoppingCart size={16} />
                    Agregar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}