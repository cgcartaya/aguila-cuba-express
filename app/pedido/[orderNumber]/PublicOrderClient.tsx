"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Share2,
  TriangleAlert,
  UserRound,
  X,
} from "lucide-react";

import { openWhatsAppShare } from "@/lib/utils/whatsapp";
import { CARD_SURCHARGE_RATE } from "@/lib/config/features";

type Order = {
  id: string;
  order_number: string | null;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  subtotal: number | null;
  delivery_fee: number | null;
  discount_amount?: number | null;
  total: number | null;
  country?: string | null;
  state?: string | null;
  municipality: string | null;
  zone_name: string | null;
  exact_address: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_phone_alt?: string | null;
  notes?: string | null;
  created_at: string;
  store_id: string | null;
};

type StoreBrand = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  og_image_url: string | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  item_type: "product" | "combo";
};

type PublicOrderData = {
  order: Order;
  items: OrderItem[];
  store: StoreBrand | null;
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

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getOrderPaymentTotals(order: Order) {
  const baseTotal = roundMoney(
    Number(order.subtotal || 0) +
      Number(order.delivery_fee || 0) -
      Number(order.discount_amount || 0)
  );
  const storedTotal = Number(order.total || 0);

  if (order.payment_method !== "card") {
    return { baseTotal, cardSurcharge: 0, displayedTotal: storedTotal };
  }

  const cardSurcharge =
    storedTotal > baseTotal
      ? roundMoney(storedTotal - baseTotal)
      : roundMoney(baseTotal * CARD_SURCHARGE_RATE);

  return {
    baseTotal,
    cardSurcharge,
    displayedTotal: roundMoney(baseTotal + cardSurcharge),
  };
}

function PayNowButton({ orderId, storeId, amountToPay }: { orderId: string; storeId: string; amountToPay: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePayNow() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout/pay-with-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, storeId }),
      });
      const result = await res.json().catch(() => null);

      if (!res.ok || !result?.success || !result?.url) {
        throw new Error(result?.message || "No se pudo iniciar el cobro con tarjeta.");
      }

      window.location.href = result.url;
    } catch (err: any) {
      setError(err?.message || "No se pudo iniciar el cobro con tarjeta.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handlePayNow}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 font-black text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
        {loading ? "Abriendo el pago..." : `Pagar ${amountToPay.toFixed(2)} ahora`}
      </button>

      {error && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-red-300">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function buildShareMessage({
  order,
  items,
  storeName,
  pageUrl,
}: {
  order: Order;
  items: OrderItem[];
  storeName: string;
  pageUrl: string;
}) {
  const publicNumber = order.order_number || order.id;
  const itemLines = items.map(
    (item) => `• ${item.product_name} ×${item.quantity}`
  );

  return [
    `🛍️ Mi pedido en *${storeName}*`,
    "",
    `Número de orden: *${publicNumber}*`,
    ...(itemLines.length ? ["", ...itemLines] : []),
    "",
    `Total final: *${getOrderPaymentTotals(order).displayedTotal.toFixed(2)}*`,
    "",
    "Ver el pedido:",
    pageUrl,
  ].join("\n");
}

function ShareOrderButton({
  order,
  items,
  storeName,
  pageUrl,
}: {
  order: Order;
  items: OrderItem[];
  storeName: string;
  pageUrl: string;
}) {
  const [open, setOpen] = useState(false);

  function share(app: "personal" | "business") {
    openWhatsAppShare({
      app,
      message: buildShareMessage({ order, items, storeName, pageUrl }),
    });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-4 font-bold text-white transition hover:bg-green-700"
      >
        <Share2 size={20} />
        Compartir mi pedido por WhatsApp
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-700">
                  Compartir pedido
                </p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
                  Elige WhatsApp
                </h2>
                <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                  Podrás elegir a quién enviárselo desde WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => share("personal")}
                className="flex items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:bg-emerald-100"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <MessageCircle size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-emerald-950">
                    WhatsApp
                  </span>
                  <span className="text-sm font-medium text-emerald-800/70">
                    Cuenta personal o WhatsApp Web
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => share("business")}
                className="flex items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:bg-blue-100"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-white">
                  <Building2 size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-blue-950">
                    WhatsApp Business
                  </span>
                  <span className="text-sm font-medium text-blue-800/70">
                    En Android intenta abrir Business directamente
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PublicOrderClient({
  requestedOrderNumber,
  initialData,
  pageUrl,
}: {
  requestedOrderNumber: string;
  initialData: PublicOrderData | null;
  pageUrl: string;
}) {
  if (!initialData) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <Clock className="mx-auto mb-3 text-gray-400" />
          <p className="font-bold text-red-600">No encontramos esta orden.</p>
          <p className="mt-2 break-all text-sm text-gray-500">
            Código consultado: {requestedOrderNumber}
          </p>
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

  const { order, items, store } = initialData;
  const statusText = statusLabels[order.status] || order.status;
  const storeName = store?.name?.trim() || "Perla Marketplace";
  const storeUrl = store?.slug ? `/tienda/${store.slug}` : "/tienda";
  const publicNumber = order.order_number || order.id;
  const { cardSurcharge, displayedTotal } = getOrderPaymentTotals(order);
  const deliveryLocation = [order.municipality, order.zone_name]
    .filter(Boolean)
    .join(" / ");
  const countryLine = [order.state, order.country].filter(Boolean).join(", ");

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link
          href={storeUrl}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver a {storeName}
        </Link>

        <section className="mb-6 rounded-[2rem] bg-black p-7 text-white shadow-sm">
          <div className="flex items-center gap-3">
            {store?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logo_url}
                alt={storeName}
                className="h-12 w-12 rounded-xl bg-white object-contain p-1"
              />
            ) : null}
            <p className="text-sm font-semibold text-white/70">
              {storeName.toUpperCase()}
            </p>
          </div>

          <h1 className="mt-3 break-all text-2xl font-black sm:text-3xl">
            Pedido {publicNumber}
          </h1>

          <div className="mt-5 flex flex-wrap gap-3">
            <span className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-black">
              {statusText}
            </span>
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
              Pago:{" "}
              {order.payment_status === "paid"
                ? "Pagado"
                : order.payment_status === "expired"
                  ? "No completado"
                  : order.payment_method === "card"
                    ? "Pendiente"
                    : "Pendiente de confirmar"}
            </span>
          </div>

          {order.payment_method === "card" && order.payment_status !== "paid" && (
            <>
              <p className="mt-4 text-sm text-white/70">
                {order.payment_status === "expired"
                  ? "El intento de pago anterior venció sin completarse. Puedes intentarlo de nuevo:"
                  : "Todavía no se ha completado el pago de este pedido."}
              </p>
              <PayNowButton orderId={order.id} storeId={order.store_id || ""} amountToPay={displayedTotal} />
            </>
          )}
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <UserRound size={20} /> Destinatario
            </h2>
            <p className="font-bold">{order.recipient_name || "Sin nombre"}</p>
            <p className="mt-1 flex items-center gap-2 text-gray-600">
              <Phone size={16} /> {order.recipient_phone || "Sin teléfono"}
            </p>
            {order.recipient_phone_alt ? (
              <p className="mt-1 text-gray-600">Alternativo: {order.recipient_phone_alt}</p>
            ) : null}
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <MapPin size={20} /> Entrega
            </h2>
            {countryLine ? <p className="font-bold">{countryLine}</p> : null}
            {deliveryLocation ? <p className="text-gray-600">{deliveryLocation}</p> : null}
            <p className="mt-2 text-gray-700">{order.exact_address || "Dirección no indicada"}</p>
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Package size={20} /> Productos
          </h2>
          <div className="space-y-3">
            {items.length ? items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border p-4">
                <div>
                  <p className="font-bold">{item.product_name}</p>
                  <p className="text-sm text-gray-500">
                    {item.item_type === "combo" ? "Combo" : "Producto"} · Cantidad: {item.quantity}
                  </p>
                </div>
                <p className="font-black">${Number(item.subtotal || 0).toFixed(2)}</p>
              </div>
            )) : (
              <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
                Esta orden no tiene productos registrados.
              </p>
            )}
          </div>
        </section>

        <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">Resumen del pago</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Productos</span><strong>${Number(order.subtotal || 0).toFixed(2)}</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Envío</span><strong>${Number(order.delivery_fee || 0).toFixed(2)}</strong></div>
            {Number(order.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-green-600"><span>Descuento</span><strong>-${Number(order.discount_amount).toFixed(2)}</strong></div>
            )}
            {order.payment_method === "card" && (
              <div className="flex justify-between text-blue-700"><span>Recargo por tarjeta ({(CARD_SURCHARGE_RATE * 100).toFixed(1)}%)</span><strong>+${cardSurcharge.toFixed(2)}</strong></div>
            )}
            <div className="flex justify-between border-t pt-3 text-xl"><span className="font-black">{order.payment_status === "paid" ? "Total pagado" : "Total a pagar"}</span><span className="font-black">${displayedTotal.toFixed(2)}</span></div>
          </div>
        </section>

        {order.notes ? (
          <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-lg font-bold">Notas</h2>
            <p className="whitespace-pre-line text-gray-600">{order.notes}</p>
          </section>
        ) : null}

        <section className="mt-5 rounded-3xl bg-green-50 p-5 text-green-800">
          <div className="flex items-center gap-2 font-black"><CheckCircle2 size={20} /> Tu pedido fue recibido correctamente.</div>
          <p className="mt-2 text-sm">El equipo de {storeName} confirmará el pago y actualizará el estado del pedido.</p>
        </section>

        <div className="mt-5">
          <ShareOrderButton
            order={order}
            items={items}
            storeName={storeName}
            pageUrl={pageUrl}
          />
        </div>
      </div>
    </main>
  );
}
