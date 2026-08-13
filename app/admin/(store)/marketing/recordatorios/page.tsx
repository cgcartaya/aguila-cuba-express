"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, Clock, Mail, MessageCircle, Phone, ShoppingCart } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import { cleanWhatsAppPhone, openWhatsAppMessage } from "@/lib/utils/whatsapp";

type CartItem = { name: string; quantity: number; price: number };

type AbandonedCart = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  items: CartItem[];
  subtotal: number;
  method: string | null;
  last_seen_at: string;
  email_reminded_at: string | null;
  whatsapp_reminded_at: string | null;
};

type UnpaidOrder = {
  id: string;
  order_number: string | null;
  total: number;
  created_at: string;
  payment_method: string | null;
  email_reminded_at: string | null;
  whatsapp_reminded_at: string | null;
  customer: { name: string | null; email: string | null; phone: string | null } | null;
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "hace menos de 1 hora";
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days === 1 ? "" : "s"}`;
}

export default function RecordatoriosPage() {
  const { isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();
  const activeStore = isSuperAdmin ? selectedStore || accessStore : accessStore;

  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [orders, setOrders] = useState<UnpaidOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const normalizedStoreIdentity = `${activeStore?.name || ""} ${activeStore?.slug || ""}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const prefersWhatsAppBusiness =
    normalizedStoreIdentity.includes("aguila") || normalizedStoreIdentity.includes("cuba express");

  async function authHeaders() {
    const { data } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${data.session?.access_token || ""}` };
  }

  const load = useCallback(async () => {
    if (!activeStore?.id) return;
    setLoading(true);
    setError("");

    const response = await fetch(
      `/api/admin/reminders?storeId=${encodeURIComponent(activeStore.id)}`,
      { headers: await authHeaders(), cache: "no-store" }
    );
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload.error || "No se pudieron cargar los recordatorios.");
    } else {
      setCarts(payload.abandonedCarts || []);
      setOrders(payload.unpaidOrders || []);
    }
    setLoading(false);
  }, [activeStore?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markWhatsAppSent(kind: "cart" | "order", id: string) {
    if (!activeStore?.id) return;
    setWorkingId(id);

    await fetch("/api/admin/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ storeId: activeStore.id, kind, id }),
    }).catch(() => null);

    if (kind === "cart") {
      setCarts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, whatsapp_reminded_at: new Date().toISOString() } : c))
      );
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, whatsapp_reminded_at: new Date().toISOString() } : o))
      );
    }
    setWorkingId(null);
  }

  function remindCart(cart: AbandonedCart) {
    if (!cart.customer_phone) return;

    const itemsText = cart.items.map((item) => `- ${item.name} x${item.quantity}`).join("\n");
    const storeName = activeStore?.name || "la tienda";
    const message =
      `Hola${cart.customer_name ? ` ${cart.customer_name}` : ""}, vimos que dejaste esto en tu carrito de ${storeName}:\n\n` +
      `${itemsText}\n\nSubtotal: $${Number(cart.subtotal || 0).toFixed(2)}\n\n¿Quieres que te ayudemos a completar tu pedido?`;

    openWhatsAppMessage({
      app: prefersWhatsAppBusiness ? "business" : "personal",
      phone: cart.customer_phone,
      message,
    });

    void markWhatsAppSent("cart", cart.id);
  }

  function remindOrder(order: UnpaidOrder) {
    const phone = order.customer?.phone;
    if (!phone) return;

    const storeName = activeStore?.name || "la tienda";
    const orderNumber = order.order_number || order.id.slice(0, 8);
    const message =
      `Hola${order.customer?.name ? ` ${order.customer.name}` : ""}, tu pedido ${orderNumber} en ${storeName} ` +
      `por $${Number(order.total || 0).toFixed(2)} todavía está pendiente de pago. ¿Te ayudamos a completarlo?`;

    openWhatsAppMessage({
      app: prefersWhatsAppBusiness ? "business" : "personal",
      phone,
      message,
    });

    void markWhatsAppSent("order", order.id);
  }

  const pendingCartsCount = useMemo(
    () => carts.filter((c) => !c.whatsapp_reminded_at).length,
    [carts]
  );
  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => !o.whatsapp_reminded_at).length,
    [orders]
  );

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-28 text-[#061b3a] md:p-6">
      <div className="mx-auto max-w-5xl">
        <AdminPageHeader
          eyebrow="Marketing"
          icon={BellRing}
          title="Recordatorios"
          description={`Carritos abandonados y órdenes sin pagar de ${activeStore?.name || "la tienda activa"}. El email se manda solo (cada 30 min); el WhatsApp es de un clic.`}
        />

        {error && (
          <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm font-semibold text-slate-500">Cargando...</p>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="mb-3 flex items-center gap-2">
                <ShoppingCart size={20} />
                <h2 className="text-lg font-black">
                  Carritos abandonados ({pendingCartsCount} sin recordar)
                </h2>
              </div>

              {carts.length === 0 ? (
                <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">
                  No hay carritos abandonados con datos de contacto en este momento.
                </p>
              ) : (
                <div className="space-y-3">
                  {carts.map((cart) => (
                    <div key={cart.id} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black">{cart.customer_name || "Cliente sin nombre"}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                            {cart.customer_email && (
                              <span className="flex items-center gap-1">
                                <Mail size={14} /> {cart.customer_email}
                              </span>
                            )}
                            {cart.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={14} /> {cart.customer_phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={14} /> {timeAgo(cart.last_seen_at)}
                            </span>
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            {cart.items.map((item) => `${item.name} ×${item.quantity}`).join(", ")}
                          </p>
                          <p className="mt-1 font-bold">${Number(cart.subtotal || 0).toFixed(2)}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {cart.email_reminded_at ? "Email de recordatorio enviado" : "Sin email de recordatorio todavía"}
                            {cart.whatsapp_reminded_at ? " · WhatsApp ya enviado" : ""}
                          </p>
                        </div>

                        {cart.customer_phone && (
                          <button
                            type="button"
                            onClick={() => remindCart(cart)}
                            disabled={workingId === cart.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
                          >
                            <MessageCircle size={16} />
                            {cart.whatsapp_reminded_at ? "Recordar de nuevo" : "Recordar por WhatsApp"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <BellRing size={20} />
                <h2 className="text-lg font-black">
                  Órdenes sin pagar ({pendingOrdersCount} sin recordar)
                </h2>
              </div>

              {orders.length === 0 ? (
                <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 shadow-sm">
                  No hay órdenes pendientes de pago hace más de 2 horas.
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-black">
                            Orden {order.order_number || `#${order.id.slice(0, 8)}`} —{" "}
                            {order.customer?.name || "Cliente sin nombre"}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                            {order.customer?.email && (
                              <span className="flex items-center gap-1">
                                <Mail size={14} /> {order.customer.email}
                              </span>
                            )}
                            {order.customer?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone size={14} /> {order.customer.phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={14} /> {timeAgo(order.created_at)}
                            </span>
                          </p>
                          <p className="mt-1 font-bold">${Number(order.total || 0).toFixed(2)}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {order.email_reminded_at ? "Email de recordatorio enviado" : "Sin email de recordatorio todavía"}
                            {order.whatsapp_reminded_at ? " · WhatsApp ya enviado" : ""}
                          </p>
                        </div>

                        {order.customer?.phone && (
                          <button
                            type="button"
                            onClick={() => remindOrder(order)}
                            disabled={workingId === order.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-green-700 disabled:opacity-60"
                          >
                            <MessageCircle size={16} />
                            {order.whatsapp_reminded_at ? "Recordar de nuevo" : "Recordar por WhatsApp"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
