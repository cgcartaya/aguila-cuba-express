"use client";

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

type Order = {
  id: string;
  order_number: string | null;
  status: string;
  payment_status?: string | null;
  subtotal: number | null;
  delivery_fee: number | null;
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

export function PublicOrderClient({
  requestedOrderNumber,
  initialData,
}: {
  requestedOrderNumber: string;
  initialData: PublicOrderData | null;
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
              Pago: {order.payment_status === "paid" ? "Pagado" : "Pendiente de confirmar"}
            </span>
          </div>
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
          <h2 className="mb-4 text-lg font-bold">Resumen</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><strong>${Number(order.subtotal || 0).toFixed(2)}</strong></div>
            <div className="flex justify-between"><span className="text-gray-500">Entrega</span><strong>${Number(order.delivery_fee || 0).toFixed(2)}</strong></div>
            <div className="flex justify-between border-t pt-3 text-xl"><span className="font-black">Total</span><span className="font-black">${Number(order.total || 0).toFixed(2)}</span></div>
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
      </div>
    </main>
  );
}
