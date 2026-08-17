"use client";

import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  Check,
  ChefHat,
  Clock3,
  Loader2,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  getMenuOrdersForAdmin,
  updateMenuOrderStatus,
} from "@/lib/services/menu-orders-admin";
import type { MenuOrder, MenuOrderStatus } from "@/lib/menu/types";

type Props = {
  storeId: string;
};

const COLUMNS: {
  status: MenuOrderStatus;
  title: string;
  next?: MenuOrderStatus;
  nextLabel?: string;
}[] = [
  {
    status: "received",
    title: "Nuevos",
    next: "preparing",
    nextLabel: "Empezar",
  },
  {
    status: "preparing",
    title: "Preparando",
    next: "ready",
    nextLabel: "Marcar listo",
  },
  {
    status: "ready",
    title: "Listos",
    next: "delivered",
    nextLabel: "Entregado",
  },
];

function minutesSince(value: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000)
  );
}

function playKitchenBeep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export default function KitchenBoard({ storeId }: Props) {
  const [orders, setOrders] = useState<MenuOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const initialLoaded = useRef(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);

    const { data } = await getMenuOrdersForAdmin(storeId);
    const active = (data || []).filter((order) =>
      ["received", "preparing", "ready"].includes(order.status)
    );

    if (initialLoaded.current) {
      const newReceived = active.filter(
        (order) =>
          order.status === "received" && !knownIds.current.has(order.id)
      );
      if (sound && newReceived.length > 0) playKitchenBeep();
    }

    knownIds.current = new Set(active.map((order) => order.id));
    initialLoaded.current = true;
    setOrders(active);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 8000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, sound]);

  const advance = async (
    order: MenuOrder,
    next: MenuOrderStatus
  ) => {
    setUpdatingId(order.id);
    const { error } = await updateMenuOrderStatus(order.id, next);
    setUpdatingId(null);
    if (error) return alert("No se pudo actualizar la orden.");
    await load(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <ChefHat size={20} />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900">Vista de cocina</h2>
            <p className="text-xs font-semibold text-slate-400">
              Se actualiza automáticamente cada 8 segundos.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSound((value) => !value)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${
              sound
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {sound ? <Volume2 size={14} /> : <VolumeX size={14} />}
            Sonido {sound ? "activo" : "apagado"}
          </button>

          <button
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {COLUMNS.map((column) => {
          const list = orders.filter(
            (order) => order.status === column.status
          );

          return (
            <section
              key={column.status}
              className="min-h-[520px] rounded-3xl bg-slate-100 p-3"
            >
              <div className="flex items-center justify-between px-2 py-2">
                <h3 className="text-sm font-black text-slate-800">
                  {column.title}
                </h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500">
                  {list.length}
                </span>
              </div>

              <div className="mt-2 space-y-3">
                {list.map((order) => {
                  const age = minutesSince(order.created_at);

                  return (
                    <article
                      key={order.id}
                      className={`rounded-2xl bg-white p-4 shadow-sm ${
                        column.status === "received"
                          ? "ring-2 ring-amber-200"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">
                            {order.order_type === "dine_in" &&
                            order.table_number
                              ? `Mesa ${order.table_number}`
                              : order.customer_name}
                          </p>
                          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-400">
                            <Clock3 size={11} /> hace {age} min
                          </p>
                        </div>

                        {column.status === "received" && (
                          <BellRing size={16} className="text-amber-500" />
                        )}
                      </div>

                      <div className="mt-4 space-y-3">
                        {(order.menu_order_items || []).map((item) => (
                          <div key={item.id}>
                            <p className="text-sm font-black text-slate-800">
                              {item.quantity}× {item.item_name}
                            </p>

                            {item.selected_options.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.selected_options.map((option) => (
                                  <p
                                    key={`${option.group_id}-${option.option_id}`}
                                    className="text-xs font-semibold text-slate-500"
                                  >
                                    {option.group_name}:{" "}
                                    <strong>{option.option_label}</strong>
                                  </p>
                                ))}
                              </div>
                            )}

                            {item.notes && (
                              <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-black text-amber-800">
                                Cocina: {item.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                          Nota general: {order.notes}
                        </p>
                      )}

                      {column.next && (
                        <button
                          onClick={() =>
                            void advance(order, column.next!)
                          }
                          disabled={updatingId === order.id}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-xs font-black text-white disabled:opacity-60"
                        >
                          {updatingId === order.id ? (
                            <Loader2
                              size={14}
                              className="animate-spin"
                            />
                          ) : (
                            <Check size={14} />
                          )}
                          {column.nextLabel}
                        </button>
                      )}
                    </article>
                  );
                })}

                {list.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-xs font-bold text-slate-400">
                    Sin órdenes
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
