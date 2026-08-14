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
import Price from "@/components/tienda/Price";
import type { Product } from "@/types/cart";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import {
  applyPlatformFee,
  getNextQuantityPriceTier,
  getPlatformFeePercent,
  getPurchaseQuantityLimit,
  getUnitPriceForQuantity,
  normalizeQuantityPriceTiers,
} from "@/lib/storefront/product-quantity-pricing";

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

  const feePercent = getPlatformFeePercent(store);

  const isDefaultStore = store?.slug === "aguila";

  const productUrl =
    store?.slug && !isDefaultStore
      ? `/tienda/${store.slug}/producto/${product.id}`
      : `/tienda/producto/${product.id}`;

  const imageUrl = getSafeImageUrl(product.image_url);
  const basePrice = Number(product.price || 0);
  const displayBasePrice = getUnitPriceForQuantity(
    basePrice,
    1,
    [],
    feePercent
  );
  const tiers = normalizeQuantityPriceTiers(
    product.product_price_tiers
  );
  const outOfStock = Number(product.stock || 0) <= 0;
  const cartItemId = `product-${product.id}`;
  const quantity = getItemQuantity(cartItemId);

  const effectivePrice = getUnitPriceForQuantity(
    basePrice,
    Math.max(1, quantity),
    tiers,
    feePercent
  );

  const maxAllowed = getPurchaseQuantityLimit({
    stock: product.stock,
    maxQuantityPerOrder: product.max_quantity_per_order,
  });

  const nextTier = getNextQuantityPriceTier(
    quantity,
    tiers
  );

  const hasQuantityDiscount =
    quantity > 0 && effectivePrice < displayBasePrice;

  function handleAddToCart() {
    if (store?.id) {
      void trackAnalyticsEvent({
        storeId: store.id,
        eventName: "add_to_cart",
        productId: String(product.id),
        itemName: product.name,
        quantity: 1,
        value: getUnitPriceForQuantity(
          basePrice,
          Math.max(1, quantity + 1),
          tiers,
          feePercent
        ),
      });
    }

    onAddToCart({ ...product, image_url: imageUrl });
  }

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <Link href={productUrl}>
        <div className="relative aspect-square w-full overflow-hidden bg-white p-2">
          {product.delivery_included === true && (
            <div className="absolute right-2 top-2 z-10 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-black text-white shadow">
              ENTREGA INCLUIDA
            </div>
          )}

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

        {Number(product.rating_count) > 0 && (
          <div className="mt-1 flex items-center gap-[2px]">
            {[1, 2, 3, 4, 5].map((item) => (
              <Star
                key={item}
                size={12}
                className={
                  item <= Math.round(Number(product.rating_avg) || 0)
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-slate-200 text-slate-200"
                }
              />
            ))}

            <span className="ml-1 text-[11px] font-semibold text-slate-400">
              ({product.rating_count})
            </span>
          </div>
        )}

        <div className="mt-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-lg font-black text-[#061b3a]">
              <Price usd={effectivePrice} />
            </p>

            {hasQuantityDiscount && (
              <span className="text-xs font-bold text-slate-400 line-through">
                <Price usd={displayBasePrice} />
              </span>
            )}
          </div>

          {nextTier && (
            <p className="mt-1 text-[11px] font-bold text-emerald-700">
              {nextTier.min_quantity}+ unidades:{" "}
              <Price usd={applyPlatformFee(nextTier.unit_price, feePercent)} /> c/u
            </p>
          )}

          {product.max_quantity_per_order != null && (
            <p className="mt-1 text-[11px] font-bold text-amber-700">
              Máximo {product.max_quantity_per_order} por pedido
            </p>
          )}
        </div>

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
              disabled={quantity >= maxAllowed}
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
