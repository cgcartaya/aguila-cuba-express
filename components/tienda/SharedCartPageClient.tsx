"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package,
  ShoppingBag,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";
import Price from "@/components/tienda/Price";
import { getSharedCart, type SharedCart } from "@/lib/services/shared-carts";
import { getProductById } from "@/lib/services/products";
import { getComboById } from "@/lib/services/combos";
import type { Combo, Product } from "@/types/cart";

export default function SharedCartPageClient() {
  const params = useParams<{ shareId: string }>();
  const router = useRouter();
  const { store } = useStore();
  const { addToCart, addComboToCart } = useCart();

  const isDefaultStore = store?.slug === "aguila";
  const storeBaseUrl =
    store?.slug && !isDefaultStore ? `/tienda/${store.slug}` : "/tienda";

  const [sharedCart, setSharedCart] = useState<SharedCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [adding, setAdding] = useState(false);
  const [addedOk, setAddedOk] = useState(false);
  const [skippedItems, setSkippedItems] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!params?.shareId) return;

      try {
        setLoading(true);
        setLoadError("");

        const { data, error } = await getSharedCart(params.shareId);

        if (!active) return;

        if (error || !data) {
          setLoadError("Este carrito compartido ya no está disponible.");
          return;
        }

        setSharedCart(data);
      } catch (err) {
        console.error("ERROR CARGANDO CARRITO COMPARTIDO:", err);
        if (active) {
          setLoadError("No se pudo cargar el carrito compartido.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [params?.shareId]);

  const total = useMemo(() => {
    if (!sharedCart) return 0;
    return sharedCart.items.reduce(
      (sum, item) => sum + Number(item.price) * item.quantity,
      0
    );
  }, [sharedCart]);

  const totalUnits = useMemo(() => {
    if (!sharedCart) return 0;
    return sharedCart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [sharedCart]);

  async function addAllToCart() {
    if (!sharedCart || adding) return;

    setAdding(true);
    setSkippedItems([]);

    const skipped: string[] = [];

    for (const item of sharedCart.items) {
      const rawId = item.id.startsWith("product-")
        ? item.id.replace("product-", "")
        : item.id.startsWith("combo-")
          ? item.id.replace("combo-", "")
          : null;

      if (!rawId) continue;

      try {
        if (item.type === "product") {
          const { data: product, error } = await getProductById(
            rawId,
            sharedCart.store_id
          );

          if (error || !product || !product.is_active) {
            skipped.push(item.name);
            continue;
          }

          const freshProduct: Product = {
            id: product.id,
            name: product.name,
            price: Number(product.price || 0),
            image_url: product.image_url,
            stock: product.stock == null ? null : Number(product.stock),
            max_quantity_per_order: product.max_quantity_per_order ?? null,
            product_price_tiers: product.product_price_tiers ?? null,
            minimum_order_exempt: product.minimum_order_exempt ?? null,
            delivery_included: product.delivery_included ?? null,
          };

          addToCart(freshProduct, item.quantity);
        } else {
          const { data: combo, error } = await getComboById(
            rawId,
            sharedCart.store_id
          );

          if (error || !combo || !combo.is_active) {
            skipped.push(item.name);
            continue;
          }

          const freshCombo: Combo = {
            id: combo.id,
            name: combo.name,
            price: Number(combo.price || 0),
            image_url: combo.image_url,
          };

          for (let i = 0; i < item.quantity; i += 1) {
            addComboToCart(freshCombo);
          }
        }
      } catch (err) {
        console.error("ERROR AGREGANDO ITEM DEL CARRITO COMPARTIDO:", err);
        skipped.push(item.name);
      }
    }

    setAdding(false);
    setSkippedItems(skipped);
    setAddedOk(true);

    if (skipped.length === 0) {
      router.push(`${storeBaseUrl}/cart`);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <Link
          href={storeBaseUrl}
          className="inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} /> Ir a la tienda
        </Link>

        {loading ? (
          <div className="mt-8 flex items-center justify-center gap-2 rounded-3xl bg-white p-12 text-slate-500 shadow-sm">
            <Loader2 className="animate-spin" size={20} />
            Cargando carrito compartido...
          </div>
        ) : loadError || !sharedCart ? (
          <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={28} />
            </span>
            <h1 className="mt-5 text-xl font-black">
              {loadError || "Carrito no encontrado"}
            </h1>
            <Link
              href={storeBaseUrl}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 font-black text-white transition hover:bg-red-700"
            >
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-1 flex items-center gap-2 text-blue-700">
              <ShoppingBag size={20} />
              <span className="text-xs font-black uppercase tracking-wide">
                Carrito compartido
              </span>
            </div>

            <h1 className="text-3xl font-black text-[#0B1F4D]">
              {totalUnits} {totalUnits === 1 ? "producto" : "productos"}
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Este es exactamente lo que había en este carrito. Los precios y
              la disponibilidad pueden haber cambiado desde entonces.
            </p>

            <section className="mt-5 space-y-3">
              {sharedCart.items.map((item) => (
                <article
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-50">
                    <Image
                      src={item.image_url || "/placeholder-product.png"}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      {item.type === "combo" ? (
                        <Package size={11} />
                      ) : (
                        <ShoppingBag size={11} />
                      )}
                      {item.type === "combo" ? "Combo" : "Producto"}
                    </div>
                    <p className="truncate font-bold text-[#0B1F4D]">
                      {item.name}
                    </p>
                    <p className="text-sm font-semibold text-slate-500">
                      {item.quantity} × <Price usd={Number(item.price)} />
                    </p>
                  </div>

                  <p className="flex-shrink-0 font-black text-[#0B1F4D]">
                    <Price usd={Number(item.price) * item.quantity} />
                  </p>
                </article>
              ))}
            </section>

            <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="font-bold text-slate-500">Total</span>
              <span className="text-xl font-black text-[#0B1F4D]">
                <Price usd={total} showUsdReference />
              </span>
            </div>

            {skippedItems.length > 0 && (
              <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                {skippedItems.length === 1
                  ? `"${skippedItems[0]}" ya no está disponible y no se agregó.`
                  : `${skippedItems.length} productos ya no están disponibles y no se agregaron: ${skippedItems.join(", ")}.`}
              </div>
            )}

            {addedOk && skippedItems.length === 0 ? (
              <div className="mt-5 flex items-center gap-2 rounded-2xl bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                <CheckCircle2 size={18} />
                Agregado a tu carrito.
              </div>
            ) : (
              <button
                type="button"
                onClick={addAllToCart}
                disabled={adding}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 py-4 font-black text-white shadow-lg shadow-red-900/20 transition hover:bg-red-700 disabled:opacity-60"
              >
                {adding ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <ShoppingBag size={18} />
                )}
                {adding ? "Agregando..." : "Agregar todo a mi carrito"}
              </button>
            )}

            {skippedItems.length > 0 && (
              <Link
                href={`${storeBaseUrl}/cart`}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-[#0B1F4D] hover:bg-slate-50"
              >
                Ver mi carrito
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
