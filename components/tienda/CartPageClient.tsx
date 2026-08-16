"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Minus,
  Package,
  Plus,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";
import { useCurrency } from "@/contexts/CurrencyContext";
import Price from "@/components/tienda/Price";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { getHomeFeaturedProductsByStoreId } from "@/lib/services/products";
import { getCombosContainingAnyProduct } from "@/lib/services/combos";
import { createSharedCart } from "@/lib/services/shared-carts";
import StoreComboCard, { type StoreCombo } from "@/components/tienda/combos/StoreComboCard";
import { getPurchaseQuantityLimit } from "@/lib/storefront/product-quantity-pricing";
import type { Product } from "@/types/cart";

type ProductWithImages = Product & {
  product_images?: Array<{
    image_url: string;
    is_main: boolean;
    position: number | null;
  }> | null;
};

function resolveProductImage(product: ProductWithImages) {
  const main = product.product_images?.find((image) => image.is_main);
  const first = product.product_images
    ?.slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

  return main?.image_url || first?.image_url || product.image_url || "/placeholder-product.png";
}

export default function CartPageClient() {
  const {
    cart,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();
  const { store } = useStore();
  const { currency } = useCurrency();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  // Combos que incluyen algún producto que ya está en el carrito.
  const [comboRecommendations, setComboRecommendations] = useState<StoreCombo[]>([]);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const isDefaultStore = store?.slug === "aguila";
  const storeBaseUrl =
    store?.slug && !isDefaultStore ? `/tienda/${store.slug}` : "/tienda";
  const checkoutUrl =
    store?.slug && !isDefaultStore
      ? `/tienda/${store.slug}/checkout`
      : "/tienda/checkout";

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );
  const totalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function shareCart() {
    if (!store?.id || cart.length === 0 || sharing) return;

    try {
      setSharing(true);

      const { data, error } = await createSharedCart(store.id, cart);
      if (error || !data) throw error || new Error("No se pudo crear el enlace.");

      const shareUrl = `${window.location.origin}${storeBaseUrl}/carrito/${data.id}`;

      const shareData = {
        title: "Mi carrito",
        text: "Mira lo que tengo en el carrito:",
        url: shareUrl,
      };

      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (shareError) {
          if ((shareError as DOMException)?.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      window.alert("Enlace del carrito copiado.");
    } catch (err) {
      console.error("ERROR COMPARTIENDO CARRITO:", err);
      window.alert("No se pudo generar el enlace para compartir.");
    } finally {
      setSharing(false);
    }
  }

  useEffect(() => {
    if (!store?.id || cart.length === 0) return;

    void trackAnalyticsEvent({
      storeId: store.id,
      eventName: "view_cart",
      value: total,
      metadata: { items: cart.length },
    });
  }, [store?.id, cart.length, total]);

  useEffect(() => {
    let active = true;

    async function loadFeaturedProducts() {
      if (!store?.id) {
        setFeaturedProducts([]);
        return;
      }

      const { data, error } = await getHomeFeaturedProductsByStoreId(store.id);
      if (!active) return;

      if (error) {
        console.error("No se pudieron cargar las recomendaciones del carrito:", error);
        setFeaturedProducts([]);
        return;
      }

      const normalized = ((data ?? []) as ProductWithImages[]).map((product) => ({
        ...product,
        image_url: resolveProductImage(product),
      }));

      setFeaturedProducts(normalized);
    }

    void loadFeaturedProducts();
    return () => {
      active = false;
    };
  }, [store?.id]);

  // Combos que incluyen algún producto que el cliente ya tiene en el
  // carrito — "complementa tu pedido con este combo". Se recalcula solo
  // cuando cambia el set de productos del carrito, no en cada render.
  const cartProductIdsKey = useMemo(
    () =>
      cart
        .filter((item) => item.type === "product")
        .map((item) => String(item.id).replace(/^product-/, ""))
        .sort()
        .join(","),
    [cart]
  );

  useEffect(() => {
    let active = true;

    async function loadComboRecommendations() {
      const productIds = cartProductIdsKey ? cartProductIdsKey.split(",") : [];

      if (!store?.id || productIds.length === 0) {
        setComboRecommendations([]);
        return;
      }

      const { data, error } = await getCombosContainingAnyProduct(productIds, store.id, 4);
      if (!active) return;

      if (error) {
        console.error("No se pudieron cargar los combos sugeridos:", error);
        setComboRecommendations([]);
        return;
      }

      setComboRecommendations((data as StoreCombo[]) || []);
    }

    void loadComboRecommendations();
    return () => {
      active = false;
    };
  }, [store?.id, cartProductIdsKey]);

  const visibleComboRecommendations = useMemo(() => {
    const cartComboIds = new Set(
      cart
        .filter((item) => item.type === "combo")
        .map((item) => String(item.id).replace(/^combo-/, ""))
    );

    return comboRecommendations.filter((combo) => !cartComboIds.has(String(combo.id)));
  }, [cart, comboRecommendations]);

  const recommendations = useMemo(() => {
    const cartProductIds = new Set(
      cart
        .filter((item) => item.type === "product")
        .map((item) => String(item.id).replace(/^product-/, ""))
    );

    return featuredProducts
      .filter(
        (product) =>
          !cartProductIds.has(String(product.id)) && Number(product.stock ?? 0) > 0
      )
      .slice(0, 4);
  }, [cart, featuredProducts]);

  function handleAddRecommendation(product: Product) {
    addToCart(product);

    if (store?.id) {
      void trackAnalyticsEvent({
        storeId: store.id,
        eventName: "add_to_cart",
        productId: String(product.id),
        itemName: product.name,
        quantity: 1,
        value: Number(product.price || 0),
        metadata: { source: "cart_recommendations" },
      });
    }
  }

  function scrollRecommendations(direction: "left" | "right") {
    recommendationsRef.current?.scrollBy({
      left: direction === "left" ? -420 : 420,
      behavior: "smooth",
    });
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 pb-[calc(9rem+env(safe-area-inset-bottom))] pt-6 text-[#061b3a] sm:pt-8 lg:pb-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-8 flex max-w-xl items-center justify-between">
          {[
            { label: "Carrito", icon: ShoppingBag, active: true },
            { label: "Pago", icon: CreditCard, active: false },
            { label: "Entrega", icon: Truck, active: false },
          ].map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="contents">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-sm ${
                      step.active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <span
                    className={`text-xs font-black ${
                      step.active ? "text-blue-700" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < 2 && <span className="mb-6 h-px flex-1 bg-slate-200" />}
              </div>
            );
          })}
        </div>

        <Link
          href={storeBaseUrl}
          className="inline-flex items-center gap-2 text-sm font-black text-blue-700 transition hover:text-blue-900"
        >
          <ArrowLeft size={17} /> Volver a la tienda
        </Link>

        {cart.length === 0 ? (
          <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <ShoppingBag size={28} />
            </span>
            <h1 className="mt-5 text-2xl font-black">Tu carrito está vacío</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Explora la tienda y agrega los productos que necesitas.
            </p>
            <Link
              href={storeBaseUrl}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-black text-white transition hover:bg-red-700"
            >
              Ir a la tienda <ArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_370px]">
            <div className="min-w-0">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black">Tu carrito</h1>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {totalUnits} {totalUnits === 1 ? "producto" : "productos"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={shareCart}
                    disabled={sharing}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 transition hover:text-blue-900 disabled:opacity-50"
                  >
                    <Share2 size={14} /> {sharing ? "Generando..." : "Compartir carrito"}
                  </button>

                  <button
                    type="button"
                    onClick={clearCart}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-red-600 transition hover:text-red-800"
                  >
                    <Trash2 size={14} /> Vaciar carrito
                  </button>
                </div>
              </div>

              <section className="mt-5 space-y-3">
                {cart.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div className="grid gap-4 sm:grid-cols-[132px_minmax(0,1fr)_110px] sm:items-center">
                      <div className="relative aspect-square w-full max-w-[132px] overflow-hidden rounded-xl bg-slate-50">
                        <Image
                          src={item.image_url || "/placeholder-product.png"}
                          alt={item.name}
                          fill
                          sizes="132px"
                          className="object-contain p-2"
                        />
                      </div>

                      <div className="min-w-0">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${
                            item.type === "combo"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          {item.type === "combo" ? <Package size={11} /> : <ShoppingBag size={11} />}
                          {item.type === "combo" ? "Combo" : "Producto"}
                        </span>
                        <h2 className="mt-2 text-base font-black leading-snug sm:text-lg">
                          {item.name}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          Precio unidad: <Price usd={Number(item.price)} />
                        </p>
                        {item.type === "product" &&
                          Number(item.base_price ?? item.price) > Number(item.price) && (
                            <p className="mt-1 text-xs font-black text-emerald-700">
                              Descuento por cantidad aplicado
                            </p>
                          )}

                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(item.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm"
                              aria-label={`Quitar uno de ${item.name}`}
                            >
                              <Minus size={15} />
                            </button>
                            <span className="min-w-9 text-center text-sm font-black">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => increaseQuantity(item.id)}
                              disabled={
                                item.type === "product" &&
                                item.quantity >=
                                  getPurchaseQuantityLimit({
                                    stock: item.stock,
                                    maxQuantityPerOrder: item.max_quantity_per_order,
                                  })
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm disabled:cursor-not-allowed disabled:text-slate-300"
                              aria-label={`Agregar uno de ${item.name}`}
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="text-xs font-black text-slate-400 transition hover:text-red-600"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0 sm:text-right">
                        <p className="text-xs font-bold text-slate-400">Subtotal</p>
                        <p className="mt-1 text-xl font-black">
                          <Price usd={Number(item.price) * item.quantity} />
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </section>

              {visibleComboRecommendations.length > 0 && (
                <section className="mt-8">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-600">
                      <Package size={17} />
                    </span>
                    <div>
                      <h2 className="text-xl font-black">Complementa tu pedido con un combo</h2>
                      <p className="text-xs font-semibold text-slate-500">
                        Incluyen algo que ya tienes en el carrito
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {visibleComboRecommendations.map((combo) => (
                      <StoreComboCard
                        key={combo.id}
                        combo={combo}
                        storeSlug={isDefaultStore ? undefined : store?.slug}
                      />
                    ))}
                  </div>
                </section>
              )}

              {recommendations.length > 0 && (
                <section className="mt-8">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <Sparkles size={17} />
                      </span>
                      <div>
                        <h2 className="text-xl font-black">Completa tu pedido</h2>
                        <p className="text-xs font-semibold text-slate-500">
                          Productos destacados de esta tienda
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => scrollRecommendations("left")}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[#061b3a] shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                        aria-label="Ver productos anteriores"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollRecommendations("right")}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-[#061b3a] shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                        aria-label="Ver más productos"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  <div
                    ref={recommendationsRef}
                    className="mt-4 flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-3 pr-3 [scrollbar-width:none] [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
                  >
                    {recommendations.map((product) => (
                      <article
                        key={product.id}
                        className="min-w-[190px] max-w-[190px] snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        <div className="relative aspect-[4/3] bg-slate-50">
                          <Image
                            src={product.image_url || "/placeholder-product.png"}
                            alt={product.name}
                            fill
                            sizes="190px"
                            className="object-contain p-3"
                          />
                        </div>
                        <div className="p-3">
                          <h3 className="line-clamp-2 min-h-10 text-sm font-black leading-tight">
                            {product.name}
                          </h3>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="font-black">
                              <Price usd={Number(product.price)} />
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddRecommendation(product)}
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 active:scale-95"
                              aria-label={`Agregar ${product.name}`}
                            >
                              <Plus size={18} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              <Link
                href={storeBaseUrl}
                className="mt-7 inline-flex items-center gap-2 rounded-xl border-2 border-blue-600 bg-white px-5 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-50"
              >
                <ArrowLeft size={16} /> Seguir comprando
              </Link>
            </div>

            <aside className="hidden rounded-3xl bg-[#061b3a] p-6 text-white shadow-xl lg:sticky lg:top-24 lg:block">
              <h2 className="text-2xl font-black">Resumen del pedido</h2>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-white/65">Subtotal</span>
                  <span className="font-black"><Price usd={total} /></span>
                </div>
                <div className="flex items-start justify-between gap-5">
                  <span className="text-white/65">Entrega</span>
                  <span className="max-w-[190px] text-right text-xs font-semibold text-white/75">
                    Se coordina después del pago
                  </span>
                </div>
              </div>

              <div className="my-6 h-px bg-white/15" />
              <div className="flex items-end justify-between gap-4">
                <span className="text-lg font-black">Total</span>
                <span className="text-3xl font-black"><Price usd={total} /></span>
              </div>
              {currency !== "USD" && (
                <p className="mt-2 text-right text-xs font-semibold text-white/50">
                  ≈ ${total.toFixed(2)} USD — el cobro se hace en dólares
                </p>
              )}

              <Link
                href={checkoutUrl}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-4 text-center font-black text-white shadow-lg shadow-red-950/20 transition hover:bg-red-700"
              >
                Continuar con el pedido <ArrowRight size={18} />
              </Link>

              <div className="mt-6 space-y-3 border-t border-white/15 pt-5 text-sm font-semibold text-white/85">
                <p className="flex items-center gap-3"><ShieldCheck size={18} /> Pago seguro</p>
                <p className="flex items-center gap-3"><Truck size={18} /> Entrega coordinada después del pago</p>
                <p className="flex items-center gap-3"><CheckCircle2 size={18} /> Confirmación antes de finalizar</p>
              </div>
              <p className="mt-5 text-xs leading-5 text-white/50">
                Podrás revisar los datos antes de completar la compra.
              </p>
            </aside>

            <div className="fixed inset-x-0 bottom-[64px] z-40 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_20px_rgba(6,27,58,0.10)] lg:hidden">
              <div className="mx-auto flex max-w-xl items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                    Total estimado
                  </p>
                  <p className="text-xl font-black"><Price usd={total} /></p>
                </div>
                <Link
                  href={checkoutUrl}
                  className="flex min-h-12 touch-manipulation select-none items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-lg transition active:scale-[0.98]"
                >
                  Continuar <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
