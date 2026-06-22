"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  Package,
  ShoppingBag,
} from "lucide-react";

import { useCart } from "@/contexts/CartContext";

export default function CartPage() {
  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const total = cart.reduce((sum, item) => {
    return sum + Number(item.price) * item.quantity;
  }, 0);

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-[#061b3a]">
      <div className="mx-auto max-w-4xl">
        {/* VOLVER */}
        <Link
          href="/tienda"
          className="inline-flex items-center gap-2 text-sm font-bold text-red-600"
        >
          <ArrowLeft size={18} />
          Volver a la tienda
        </Link>

        {/* HEADER */}
        <div className="mt-6 flex items-center justify-between">
          <h1 className="text-3xl font-black">
            Mi carrito
          </h1>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-sm font-black text-red-600"
            >
              Vaciar carrito
            </button>
          )}
        </div>

        {/* VACÍO */}
        {cart.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-100 p-8 text-center shadow-sm">
            <p className="text-lg font-bold">
              Tu carrito está vacío
            </p>

            <Link
              href="/tienda"
              className="mt-5 inline-block rounded-xl bg-red-600 px-6 py-3 font-black text-white"
            >
              Ir a la tienda
            </Link>
          </div>
        ) : (
          <>
            {/* ITEMS */}
            <section className="mt-6 space-y-4">
              {cart.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-4">
                    {/* IMAGEN */}
                    <div className="relative h-24 w-24 shrink-0">
                      <Image
                        src={
                          item.image_url ||
                          "/placeholder-product.png"
                        }
                        alt={item.name}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>

                    {/* INFO */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        {/* BADGE */}
                        <div className="mb-2">
                          {item.type === "combo" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                              <Package size={12} />
                              Combo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-700">
                              <ShoppingBag size={12} />
                              Producto
                            </span>
                          )}
                        </div>

                        <h2 className="font-black">
                          {item.name}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Precio unidad: $
                          {Number(item.price).toFixed(2)}
                        </p>
                      </div>

                      {/* CONTROLES */}
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-xl border border-slate-200">
                          <button
                            onClick={() =>
                              decreaseQuantity(item.id)
                            }
                            className="flex h-9 w-9 items-center justify-center"
                          >
                            <Minus size={16} />
                          </button>

                          <span className="min-w-8 text-center text-sm font-black">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() =>
                              increaseQuantity(item.id)
                            }
                            className="flex h-9 w-9 items-center justify-center"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <button
                          onClick={() =>
                            removeFromCart(item.id)
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SUBTOTAL */}
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-sm font-bold text-slate-500">
                      Subtotal
                    </span>

                    <span className="text-lg font-black">
                      $
                      {(
                        Number(item.price) *
                        item.quantity
                      ).toFixed(2)}
                    </span>
                  </div>
                </article>
              ))}
            </section>

            {/* TOTAL */}
            <section className="mt-6 rounded-2xl bg-[#061b3a] p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">
                  Total
                </span>

                <span className="text-2xl font-black">
                  ${total.toFixed(2)}
                </span>
              </div>

              <Link
                href="/tienda/checkout"
                className="mt-5 block w-full rounded-xl bg-red-600 py-4 text-center font-black text-white"
              >
                Proceder al pago
              </Link>
            </section>
          </>
        )}
      </div>
    </main>
  );
}