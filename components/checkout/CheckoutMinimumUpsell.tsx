"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";

import Price from "@/components/tienda/Price";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";
import { getStoreProductsByStoreId } from "@/lib/services/products";
import {
  getPlatformFeePercent,
  getUnitPriceForQuantity,
} from "@/lib/storefront/product-quantity-pricing";
import type { Product } from "@/types/cart";

type Props = {
  open: boolean;
  missingAmount: number;
  minimumOrder: number;
  subtotal: number;
  onClose: () => void;
};

type CheckoutProduct = Product & {
  product_images?: Array<{
    image_url: string;
    is_main?: boolean | null;
    position?: number | null;
  }> | null;
};

function resolveImage(product: CheckoutProduct) {
  const images = product.product_images || [];
  const main = images.find((image) => image.is_main);
  const first = images.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];
  return main?.image_url || first?.image_url || product.image_url || "/placeholder-product.png";
}

export default function CheckoutMinimumUpsell({
  open,
  missingAmount,
  minimumOrder,
  subtotal,
  onClose,
}: Props) {
  const { store } = useStore();
  const { cart, addToCart, getItemQuantity, increaseQuantity, decreaseQuantity } = useCart();
  const [products, setProducts] = useState<CheckoutProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const feePercent = getPlatformFeePercent(store);

  useEffect(() => {
    if (!open || !store?.id || products.length > 0) return;
    let active = true;
    setLoading(true);

    getStoreProductsByStoreId(store.id)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) throw error;
        setProducts(((data || []) as CheckoutProduct[]).filter((product) => Number(product.stock || 0) > 0));
      })
      .catch((error) => {
        console.error("No se pudieron cargar productos para completar el pedido:", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, products.length, store?.id]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  const cartProductIds = useMemo(
    () => new Set(cart.filter((item) => item.type === "product").map((item) => item.id.replace("product-", ""))),
    [cart]
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products
      .filter((product) =>
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        String(product.category || "").toLowerCase().includes(normalizedQuery)
      )
      .sort((a, b) => {
        const aInCart = cartProductIds.has(String(a.id)) ? 1 : 0;
        const bInCart = cartProductIds.has(String(b.id)) ? 1 : 0;
        if (aInCart !== bInCart) return aInCart - bInCart;
        const aFeatured = a.is_home_featured ? 1 : 0;
        const bFeatured = b.is_home_featured ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
        return Math.abs(Number(a.price) - missingAmount) - Math.abs(Number(b.price) - missingAmount);
      })
      .slice(0, normalizedQuery ? 30 : 18);
  }, [cartProductIds, missingAmount, products, query]);

  if (!open) return null;

  const completed = missingAmount <= 0;
  const progress = minimumOrder > 0 ? Math.min(100, (subtotal / minimumOrder) * 100) : 100;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/45 backdrop-blur-[2px]" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Agregar productos para completar el pedido"
        className="flex h-full w-full flex-col bg-slate-50 shadow-2xl sm:max-w-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">¿Falta algo?</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Completa tu pedido</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700">
              <X size={20} />
            </button>
          </div>

          <div className={`mt-4 rounded-2xl p-4 ${completed ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-blue-950"}`}>
            <div className="flex items-center justify-between gap-3 text-sm font-black">
              <span>{completed ? "¡Compra mínima alcanzada!" : <>Te faltan <Price usd={missingAmount} /></>}</span>
              <span><Price usd={subtotal} /> / <Price usd={minimumOrder} /></span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className={`h-full rounded-full transition-all ${completed ? "bg-emerald-500" : "bg-blue-600"}`} style={{ width: `${progress}%` }} />
            </div>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-blue-400 focus-within:bg-white">
            <Search size={19} className="text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar productos" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
          </label>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="grid min-h-48 place-items-center text-sm font-bold text-slate-500"><Loader2 className="mb-2 animate-spin" /> Cargando productos...</div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">No encontramos productos disponibles con esa búsqueda.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visibleProducts.map((product) => {
                const cartId = `product-${product.id}`;
                const quantity = getItemQuantity(cartId);
                const price = getUnitPriceForQuantity(Number(product.price || 0), Math.max(1, quantity), product.product_price_tiers || [], feePercent);
                return (
                  <article key={product.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="aspect-square overflow-hidden rounded-xl bg-white"><img src={resolveImage(product)} alt={product.name} className="h-full w-full object-contain p-2" /></div>
                    <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-black leading-5 text-slate-900">{product.name}</h3>
                    <p className="mt-1 text-base font-black text-blue-700"><Price usd={price} /></p>
                    <div className="mt-auto pt-3">
                      {quantity === 0 ? (
                        <button type="button" onClick={() => addToCart({ ...product, image_url: resolveImage(product) })} className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white hover:bg-blue-700">
                          <Plus size={15} /> Agregar
                        </button>
                      ) : (
                        <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-1">
                          <button type="button" onClick={() => decreaseQuantity(cartId)} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-blue-700 shadow-sm"><Minus size={15} /></button>
                          <span className="text-sm font-black text-blue-950">{quantity}</span>
                          <button type="button" onClick={() => increaseQuantity(cartId)} className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white shadow-sm"><Plus size={15} /></button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white p-4 sm:px-6">
          <button type="button" onClick={onClose} className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black text-white ${completed ? "bg-emerald-600" : "bg-slate-950"}`}>
            {completed ? <CheckCircle2 size={20} /> : <ShoppingBag size={20} />}
            {completed ? "Continuar con el pedido" : "Volver al checkout"}
          </button>
        </footer>
      </section>
    </div>
  );
}
