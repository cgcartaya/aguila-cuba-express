"use client";

import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";

import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/hooks/useStore";

export default function FloatingCartBar() {
  const { cart } = useCart();
  const { store } = useStore();

  if (cart.length === 0) return null;
const isDefaultStore = store?.slug === "aguila";

const cartUrl =
  store?.slug && !isDefaultStore
    ? `/tienda/${store.slug}/cart`
    : "/tienda/cart";

  const totalProducts = cart.reduce(
    (acc, item) => acc + item.quantity,
    0
  );

  const totalPrice = cart.reduce(
    (acc, item) => acc + Number(item.price) * item.quantity,
    0
  );

  return (
    <div className="fixed bottom-[88px] left-0 right-0 z-50 px-4 md:bottom-6">
      <div className="mx-auto max-w-xl">
        <Link
          href={cartUrl}
          className="flex items-center justify-between rounded-2xl bg-[#061b3a] px-5 py-4 text-white shadow-2xl transition hover:scale-[1.01]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/10 p-2">
              <ShoppingCart size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase text-slate-300">
                Ver carrito
              </p>

              <p className="font-black">
                {totalProducts} productos · ${totalPrice.toFixed(2)}
              </p>
            </div>
          </div>

          <ArrowRight size={22} />
        </Link>
      </div>
    </div>
  );
}