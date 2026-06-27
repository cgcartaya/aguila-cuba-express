"use client";

/* =========================================================
   CLIENT - PÁGINA PÚBLICA DE PEDIDO

   Toda la lógica visual y consulta a Supabase vive aquí.
   page.tsx queda como Server Component para Open Graph.
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Phone,
  UserRound,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status?: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  municipality: string;
  zone_name: string;
  exact_address: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_phone_alt?: string | null;
  notes?: string | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  item_type: "product" | "combo";
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  ready: "Listo",
  on_the_way: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export function PublicOrderClient({ orderNumber }: { orderNumber: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true);
        setError("");

        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("*")
          .eq("order_number", orderNumber)
          .maybeSingle();

        if (orderError) throw orderError;

        if (!orderData) {
          setError("No encontramos esta orden.");
          return;
        }

        setOrder(orderData);

        const { data: itemsData, error: itemsError } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", orderData.id);

        if (itemsError) throw itemsError;

        setItems(itemsData || []);
      } catch (err: any) {
        console.error("ERROR CARGANDO PEDIDO:", err);
        setError(err?.message || "No se pudo cargar el pedido.");
      } finally {
        setLoading(false);
      }
    }

    if (orderNumber) loadOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <Clock className="mx-auto mb-3 animate-pulse text-gray-400" />
          <p className="font-semibold text-gray-600">Cargando pedido...</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="font-bold text-red-600">{error}</p>

          <Link
            href="/tienda"
            className="mt-5 inline-flex rounded-2xl bg-black px-5 py-3 font-bold text-white"
          >
            Volver a la tienda
          </Link>
        </div>
      </main>
    );
  }

  const statusText = statusLabels[order.status] || order.status;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link
          href="/tienda"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver a la tienda
        </Link>

        <section className="mb-6 rounded-[2rem] bg-black p-7 text-white shadow-sm">
          <p className="text-sm font-semibold text-white/60">
            ÁGUILA CUBA EXPRESS
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Pedido {order.order_number}
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-black">
              {statusText}
            </span>

            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
              Pago:{" "}
              {order.payment_status === "paid"
                ? "Pagado"
                : "Pendiente de confirmar"}
            </span>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <UserRound size={20} />
              Destinatario
            </h2>

            <p className="font-bold">{order.recipient_name}</p>

            <p className="mt-1 flex items-center gap-2 text-gray-600">
              <Phone size={16} />
              {order.recipient_phone}
            </p>

            {order.recipient_phone_alt && (
              <p className="mt-1 text-gray-600">
                Alternativo: {order.recipient_phone_alt}
              </p>
            )}
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <MapPin size={20} />
              Entrega
            </h2>

            <p className="font-bold">Cienfuegos, Cuba</p>

            <p className="text-gray-600">
              {order.municipality} / {order.zone_name}
            </p>

            <p className="mt-2 text-gray-700">{order.exact_address}</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Package size={20} />
            Productos
          </h2>

          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 rounded-2xl border p-4"
              >
                <div>
                  <p className="font-bold">{item.product_name}</p>
                  <p className="text-sm text-gray-500">
                    {item.item_type === "combo" ? "Combo" : "Producto"} ·
                    Cantidad: {item.quantity}
                  </p>
                </div>

                <p className="font-black">
                  ${Number(item.subtotal).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Resumen</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <strong>${Number(order.subtotal || 0).toFixed(2)}</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Domicilio</span>
              <strong>${Number(order.delivery_fee || 0).toFixed(2)}</strong>
            </div>

            <div className="flex justify-between border-t pt-3 text-xl">
              <span className="font-black">Total</span>
              <span className="font-black">
                ${Number(order.total || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        {order.notes && (
          <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-lg font-bold">Notas</h2>
            <p className="text-gray-600">{order.notes}</p>
          </section>
        )}

        <section className="mt-5 rounded-3xl bg-green-50 p-5 text-green-800">
          <div className="flex items-center gap-2 font-black">
            <CheckCircle2 size={20} />
            Tu pedido fue recibido correctamente.
          </div>

          <p className="mt-2 text-sm">
            El equipo de Águila Cuba Express confirmará el pago y actualizará el
            estado del pedido.
          </p>
        </section>
      </div>
    </main>
  );
}