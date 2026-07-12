"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";

import { getStoreProductsByStoreId } from "@/lib/services/products";
import { getDefaultStore } from "@/lib/services/stores";
import type { Product } from "@/types/cart";
import type { Store } from "@/lib/saas/store-types";

type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type StoreProduct = Product & {
  product_images?: ProductImage[] | null;
};

function getSafeImageUrl(url?: string | null) {
  return url?.trim() || "/placeholder-product.png";
}

function getMainImage(product: StoreProduct) {
  const images =
    product.product_images
      ?.slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)) ?? [];

  return getSafeImageUrl(
    images.find((image) => image.is_main)?.image_url ||
      images[0]?.image_url ||
      product.image_url
  );
}

function getProductUrl(store: Store | null, productId: string | number) {
  const slug = store?.slug?.trim();

  if (!slug || slug === "aguila" || slug === "aguila-cuba-express") {
    return `/tienda/producto/${productId}`;
  }

  return `/tienda/${slug}/producto/${productId}`;
}

export default function TrackingProductsCarousel() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      try {
        setLoading(true);

        const storeResult = await getDefaultStore();
        const currentStore = storeResult?.data ?? null;

        if (!mounted || !currentStore) {
          if (mounted) {
            setStore(null);
            setProducts([]);
          }
          return;
        }

        const { data, error } = await getStoreProductsByStoreId(
          currentStore.id
        );

        if (error) {
          console.error(
            "Error cargando productos para rastreo:",
            error
          );
        }

        if (!mounted) return;

        setStore(currentStore);
        setProducts((data as StoreProduct[] | null) ?? []);
      } catch (error) {
        console.error(
          "No se pudieron cargar los productos del rastreo:",
          error
        );

        if (mounted) {
          setProducts([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const featuredProducts = useMemo(() => {
    const available = products.filter(
      (product) => Number(product.stock || 0) > 0
    );

    const source = available.length >= 4 ? available : products;

    return source.slice(0, 8);
  }, [products]);

  if (!loading && featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-red-600">
            Compra para tu próximo envío
          </p>

          <h2 className="mt-1 text-2xl font-black text-[#062446]">
            Productos disponibles
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Estos productos son reales y se actualizan directamente desde
            la tienda de Águila Cuba Express.
          </p>
        </div>

        <Link
          href="/tienda"
          className="hidden items-center gap-2 text-sm font-black text-[#062446] sm:inline-flex"
        >
          Ver todos
          <ArrowRight size={17} />
        </Link>
      </div>

      {loading ? (
        <div className="mt-5 flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-64 min-w-[155px] animate-pulse rounded-2xl bg-slate-100 sm:min-w-[180px]"
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {featuredProducts.map((product) => {
            const imageUrl = getMainImage(product);
            const outOfStock = Number(product.stock || 0) <= 0;
            const productUrl = getProductUrl(store, product.id);

            return (
              <article
                key={product.id}
                className="group min-w-[155px] max-w-[155px] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-w-[180px] sm:max-w-[180px]"
              >
                <Link href={productUrl}>
                  <div className="relative aspect-square overflow-hidden bg-white p-2">
                    {outOfStock ? (
                      <span className="absolute left-2 top-2 z-10 rounded-full bg-red-600 px-2 py-1 text-[10px] font-black text-white">
                        AGOTADO
                      </span>
                    ) : null}

                    <img
                      src={imageUrl}
                      alt={product.name}
                      loading="lazy"
                      className={`h-full w-full object-contain p-2 transition duration-300 ${
                        outOfStock
                          ? "opacity-50 grayscale"
                          : "group-hover:scale-105"
                      }`}
                      onError={(event) => {
                        event.currentTarget.src =
                          "/placeholder-product.png";
                      }}
                    />
                  </div>
                </Link>

                <div className="p-3 pt-1">
                  <Link href={productUrl}>
                    <h3 className="line-clamp-2 min-h-[38px] text-sm font-black leading-tight text-[#061b3a]">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="mt-2 text-lg font-black text-red-600">
                    ${Number(product.price || 0).toFixed(2)}
                  </p>

                  <Link
                    href={productUrl}
                    className="mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#062446] px-3 text-sm font-bold text-white transition hover:bg-[#0A3764]"
                  >
                    <ShoppingBag size={16} />
                    Ver producto
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Link
        href="/tienda"
        className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 font-black text-white transition hover:bg-red-700 sm:hidden"
      >
        Ver todos los productos
        <ArrowRight size={18} />
      </Link>
    </section>
  );
}
