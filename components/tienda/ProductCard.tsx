"use client";

/* =========================================================
   PRODUCT CARD V2 COMPACTA
   Mantiene el contexto de tienda multiempresa.
   Usa <img> normal para imágenes de productos de Supabase.
========================================================= */

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Star } from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";
import type { Product } from "@/types/cart";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product) => void;
};

function getSafeImageUrl(url?: string | null) {
  return url?.trim() || "/placeholder-product.png";
}

export default function ProductCard({
  product,
  onAddToCart,
}: ProductCardProps) {
  const {
    getItemQuantity,
    increaseQuantity,
    decreaseQuantity,
  } = useCart();

  const { store } = useStore();

  const isDefaultStore = store?.slug === "aguila";

  const productUrl =
    store?.slug && !isDefaultStore
      ? `/tienda/${store.slug}/producto/${product.id}`
      : `/tienda/producto/${product.id}`;

  const imageUrl = getSafeImageUrl(product.image_url);
  const price = Number(product.price || 0).toFixed(2);
  const outOfStock = Number(product.stock || 0) <= 0;
  const cartItemId = `product-${product.id}`;
  const quantity = getItemQuantity(cartItemId);

  function handleAddToCart() {
    if (store?.id) {
      void trackAnalyticsEvent({
        storeId: store.id,
        eventName: "add_to_cart",
        productId: product.id,
        itemName: product.name,
        quantity: 1,
        value: Number(product.price || 0),
      });
    }

    onAddToCart({ ...product, image_url: imageUrl });
  }

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={productUrl}>
        <div className="relative aspect-square w-full overflow-hidden bg-white p-2">
          {outOfStock && (
            <div className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white shadow">
              AGOTADO
            </div>
          )}

          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 260px"
            quality={72}
            className={`object-contain p-4 transition duration-300 ${
              outOfStock ? "opacity-50 grayscale" : "group-hover:scale-105"
            }`}
          />
        </div>
      </Link>

      <div className="p-3 pt-1">
        <Link href={productUrl}>
          <h3 className="line-clamp-2 min-h-[38px] text-sm font-black leading-tight text-[#061b3a]">
            {product.name}
          </h3>
        </Link>

        <div className="mt-1 flex items-center gap-[2px]">
          {[1, 2, 3, 4, 5].map((item) => (
            <Star
              key={item}
              size={12}
              className="fill-yellow-400 text-yellow-400"
            />
          ))}

          <span className="ml-1 text-[11px] font-semibold text-slate-400">
            (24)
          </span>
        </div>

        <p className="mt-2 text-lg font-black text-[#061b3a]">
          ${price}
        </p>

        {outOfStock ? (
          <button
            disabled
            className="mt-2 w-full rounded-xl bg-slate-300 py-2 text-sm font-black text-white"
          >
            Agotado
          </button>
        ) : quantity === 0 ? (
          <button
            type="button"
            onClick={handleAddToCart}
            className="mt-2 w-full rounded-xl bg-red-600 py-2 text-sm font-black text-white transition hover:bg-red-700"
          >
            Agregar
          </button>
        ) : (
          <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => decreaseQuantity(cartItemId)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm"
            >
              <Minus size={16} />
            </button>

            <span className="text-sm font-black">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() => increaseQuantity(cartItemId)}
              disabled={quantity >= Number(product.stock)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white shadow-sm transition hover:bg-red-700 disabled:bg-slate-300"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
