"use client";

import { AlertTriangle, ShoppingBag, X } from "lucide-react";

import Price from "@/components/tienda/Price";

type Props = {
  open: boolean;
  minimumOrder: number;
  missingAmount: number;
  onAddProducts: () => void;
  onClose: () => void;
};

export default function CheckoutMinimumAlert({
  open,
  minimumOrder,
  missingAmount,
  onAddProducts,
  onClose,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="minimum-order-title"
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-amber-50 to-orange-50 px-6 pb-5 pt-7 text-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar alerta"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/80 text-slate-600 shadow-sm"
          >
            <X size={18} />
          </button>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle size={32} />
          </span>
          <h2 id="minimum-order-title" className="mt-4 text-2xl font-black text-slate-950">
            Aún no alcanzas la compra mínima
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-600">
            Para esta zona el mínimo es de <strong><Price usd={minimumOrder} /></strong>.
          </p>
          <div className="mx-auto mt-4 w-fit rounded-2xl bg-white px-5 py-3 text-lg font-black text-amber-800 shadow-sm">
            Te faltan <Price usd={missingAmount} />
          </div>
        </div>

        <div className="space-y-3 p-5">
          <button
            type="button"
            onClick={onAddProducts}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-black text-white shadow-md hover:bg-blue-700"
          >
            <ShoppingBag size={20} /> Agregar más productos
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 font-bold text-slate-600 hover:bg-slate-50"
          >
            Cerrar y revisar el pedido
          </button>
          <p className="text-center text-xs font-semibold leading-5 text-slate-400">
            Tus datos del checkout permanecen guardados.
          </p>
        </div>
      </section>
    </div>
  );
}
