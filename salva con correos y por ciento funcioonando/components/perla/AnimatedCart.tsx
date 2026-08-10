"use client";

import { useEffect, useState } from "react";
import {
  Apple,
  Box,
  Coffee,
  Laptop,
  Package,
  ShoppingCart,
  Shirt,
} from "lucide-react";

const ITEMS = [
  { name: "Café Premium", price: 12, icon: Coffee },
  { name: "Frutas frescas", price: 18, icon: Apple },
  { name: "Camisa básica", price: 24, icon: Shirt },
  { name: "Accesorio tech", price: 32, icon: Laptop },
];

export default function AnimatedCart() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);

    const addTimer = window.setInterval(() => {
      setCount((current) => {
        if (current >= ITEMS.length) {
          window.clearInterval(addTimer);
          return current;
        }
        return current + 1;
      });
    }, 800);

    const resetTimer = window.setTimeout(() => setCount(0), 5200);

    return () => {
      window.clearInterval(addTimer);
      window.clearTimeout(resetTimer);
    };
  }, []);

  const total = ITEMS.slice(0, count).reduce(
    (sum, item) => sum + item.price,
    0
  );

  return (
    <div className="relative h-full overflow-hidden bg-gradient-to-br from-[#100d2b] via-[#13112f] to-[#080b18] p-5 text-white sm:p-7">
      <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl" />
      <div className="absolute -bottom-20 left-10 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fuchsia-300">
              Carrito inteligente
            </p>
            <h3 className="mt-1 text-2xl font-black">Tu compra toma vida</h3>
            <p className="mt-2 max-w-md text-sm text-slate-300">
              Los productos se agregan, el total se actualiza y el pedido queda
              listo en segundos.
            </p>
          </div>

          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-[0_16px_40px_rgba(168,85,247,.35)]">
            <ShoppingCart size={30} />
            <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-black text-violet-700">
              {count}
            </span>
          </div>
        </div>

        <div className="mt-7 grid flex-1 gap-4 sm:grid-cols-[1fr_.9fr]">
          <div className="grid grid-cols-2 gap-3">
            {ITEMS.map((item, index) => {
              const Icon = item.icon;
              const added = index < count;

              return (
                <div
                  key={item.name}
                  className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-700 ${
                    added
                      ? "-translate-y-1 border-violet-300/35 bg-white/10 opacity-100 shadow-[0_18px_50px_rgba(94,43,180,.18)]"
                      : "border-white/10 bg-white/[0.04] opacity-45"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-fuchsia-300">
                    <Icon size={21} />
                  </div>
                  <p className="mt-3 text-xs font-black">{item.name}</p>
                  <p className="mt-1 text-sm font-black text-fuchsia-300">
                    ${item.price.toFixed(2)}
                  </p>

                  {added && (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-[11px] font-black text-emerald-950">
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col justify-between rounded-[26px] border border-white/10 bg-white/[0.07] p-5 backdrop-blur">
            <div>
              <div className="flex items-center gap-2">
                <Package size={18} className="text-fuchsia-300" />
                <p className="text-sm font-black">Resumen del pedido</p>
              </div>

              <div className="mt-5 space-y-3">
                {ITEMS.slice(0, count).map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between border-b border-white/10 pb-2 text-xs"
                    style={{
                      animation: `cartItem .45s ease-out ${index * 90}ms both`,
                    }}
                  >
                    <span className="text-slate-300">{item.name}</span>
                    <span className="font-black">${item.price.toFixed(2)}</span>
                  </div>
                ))}

                {count === 0 && (
                  <div className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 text-center">
                    <Box className="mb-2 text-white/35" />
                    <p className="text-xs font-bold text-white/45">
                      El carrito está esperando productos…
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
                    Total
                  </p>
                  <p className="mt-1 text-3xl font-black">${total.toFixed(2)}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black ${
                    count === ITEMS.length
                      ? "bg-emerald-400 text-emerald-950"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  {count === ITEMS.length
                    ? "Pedido listo"
                    : `${count}/${ITEMS.length} productos`}
                </span>
              </div>

              <button
                type="button"
                className={`mt-4 w-full rounded-2xl py-3 text-sm font-black transition ${
                  count === ITEMS.length
                    ? "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-lg"
                    : "bg-white/10 text-white/40"
                }`}
              >
                Continuar al checkout
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes cartItem {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
