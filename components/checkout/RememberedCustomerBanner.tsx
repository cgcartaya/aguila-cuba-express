"use client";

/* =========================================================
   REMEMBERED CUSTOMER BANNER
   ---------------------------------------------------------
   Se muestra cuando el checkout reconoce el dispositivo (ver
   app/api/checkout/remembered-profile/route.ts). No es un
   login real — es solo "ya usamos tus datos de la última vez,
   revísalos y cambia lo que quieras". Incluye "repetir pedido"
   para volver a agregar al carrito lo que compró antes.
========================================================= */

import { useState } from "react";
import { RotateCcw, Sparkles, X } from "lucide-react";

type RecentOrderItem = {
  order_id: string;
  item_type: "product" | "combo";
  product_id: string | null;
  product_name: string;
  quantity: number;
  current_price: number | null;
  current_stock: number | null;
  image_url: string | null;
  available: boolean;
};

type RecentOrder = {
  id: string;
  order_number: string | null;
  created_at: string;
  total: number;
  items: RecentOrderItem[];
};

type Props = {
  customerName: string;
  recentOrders: RecentOrder[];
  onForget: () => void;
  onReorder: (items: RecentOrderItem[]) => void;
};

export default function RememberedCustomerBanner({ customerName, recentOrders, onForget, onReorder }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [reorderedId, setReorderedId] = useState<string | null>(null);

  if (dismissed) return null;

  const firstName = customerName.split(" ")[0] || "de nuevo";

  return (
    <div className="mb-5 min-w-0 overflow-hidden rounded-3xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Sparkles size={16} />
          </span>
          <div>
            <p className="text-sm font-extrabold text-blue-950">¡Hola {firstName}!</p>
            <p className="mt-0.5 text-xs font-semibold text-blue-800">
              Ya completamos tus datos con los de tu última compra en este dispositivo — revísalos y cambia lo que quieras.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            onForget();
          }}
          aria-label="No soy yo, olvidar estos datos"
          title="No soy yo"
          className="shrink-0 rounded-full p-1.5 text-blue-400 transition hover:bg-blue-100 hover:text-blue-700"
        >
          <X size={16} />
        </button>
      </div>

      {recentOrders.length > 0 && (
        <div className="mt-3.5 space-y-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-blue-700/70">Tus pedidos recientes</p>

          {recentOrders.map((order) => {
            const availableItems = order.items.filter((item) => item.available);
            const hasAnyAvailable = availableItems.length > 0;

            return (
              <div
                key={order.id}
                className="flex min-w-0 items-center justify-between gap-3 rounded-2xl bg-white px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">
                    {order.order_number || `#${order.id.slice(0, 8)}`} · ${Number(order.total || 0).toFixed(2)}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {order.items.map((i) => i.product_name).join(", ") || "Sin productos"}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!hasAnyAvailable}
                  onClick={() => {
                    onReorder(availableItems);
                    setReorderedId(order.id);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-black transition ${
                    !hasAnyAvailable
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : reorderedId === order.id
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <RotateCcw size={13} />
                  {!hasAnyAvailable
                    ? "Ya no disponible"
                    : reorderedId === order.id
                      ? "Agregado"
                      : "Repetir"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
