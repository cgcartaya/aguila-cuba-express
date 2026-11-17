"use client";
import { useRef, useState } from "react";
import { getOriginalCartItemId } from "@/lib/utils/checkout";
import { useCart } from "@/contexts/CartContext";
import { normalizeStoreWhatsapp } from "@/lib/utils/store-whatsapp";

export default function LymCheckout({
  storeId,
  whatsapp,
}: {
  storeId: string;
  whatsapp: string;
}) {
  const { cart, clearCart } = useCart();
  const key = useRef<string | null>(null);
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{
    number: string;
    summary: string;
    total: number;
  } | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    recipient_name: "",
    recipient_phone: "",
    exact_address: "",
    delivery_place: "",
    notes: "",
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    key.current ||= crypto.randomUUID();
    try {
      const response = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          requestKey: key.current,
          form,
          items: cart.map((i) => ({
            item_type: i.type || "product",
            product_id: i.type === "combo" ? null : getOriginalCartItemId(i.id),
            combo_id: i.type === "combo" ? getOriginalCartItemId(i.id) : null,
            quantity: i.quantity,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.message || "No se pudo enviar.");
      const order = result.order;
      const summary = `LYM · SOLICITUD PENDIENTE DE CONFIRMACIÓN\nOrden: ${order.order_number}\nComprador: ${form.name} · ${form.phone}\nDestinatario: ${form.recipient_name} · ${form.recipient_phone}\nEntrega: ${form.exact_address}\nLugar: ${form.delivery_place}\n${cart.map((i) => `${i.quantity} × ${i.name}`).join("\n")}\nTotal solicitado: $${Number(order.total).toFixed(2)}\nNotas: ${form.notes}\nSujeto a disponibilidad y confirmación de LYM.\n${location.origin}/pedido/${order.order_number}`;
      setSuccess({
        number: order.order_number,
        summary,
        total: Number(order.total),
      });
      clearCart();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo enviar la solicitud.",
      );
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }
  const input = "mt-1 w-full rounded-xl border border-slate-300 p-3";
  if (success)
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-3xl font-black">Solicitud recibida</h1>
        <p className="my-4">
          Orden <strong>{success.number}</strong> · ${success.total.toFixed(2)}
        </p>
        <p>
          LYM revisará la disponibilidad, los precios y la entrega antes de
          confirmar tu venta. No necesitas pagar en línea.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            className="rounded-xl bg-green-700 p-3 font-bold text-white"
            href={`https://wa.me/${normalizeStoreWhatsapp(whatsapp) || ""}?text=${encodeURIComponent(success.summary)}`}
            target="_blank"
            rel="noreferrer"
          >
            Compartir por WhatsApp
          </a>
          <a
            className="rounded-xl border p-3"
            href={`/pedido/${success.number}`}
          >
            Ver solicitud
          </a>
        </div>
      </main>
    );
  return (
    <main className="mx-auto max-w-3xl p-4 pb-24">
      <a href="/tienda/lym/cart" className="text-blue-700">
        Volver al carrito
      </a>
      <h1 className="mt-5 text-3xl font-black">Enviar solicitud a LYM</h1>
      <p className="my-4 rounded-xl bg-amber-50 p-4">
        Tu solicitud está sujeta a disponibilidad y confirmación de la tienda.
        Las cantidades no se reservan y no necesitas pagar en línea.
      </p>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 rounded-2xl bg-white p-5 sm:grid-cols-2">
          {Object.entries({
            name: "Nombre del comprador",
            phone: "Teléfono del comprador",
            recipient_name: "Nombre del destinatario",
            recipient_phone: "Teléfono del destinatario",
            exact_address: "Dirección de entrega",
            delivery_place: "Lugar de entrega / referencia",
            notes: "Notas del pedido",
          }).map(([k, label]) => (
            <label
              key={k}
              className={
                ["notes", "exact_address"].includes(k) ? "sm:col-span-2" : ""
              }
            >
              {label}
              {k === "notes" ? (
                <textarea
                  className={input}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  maxLength={2000}
                />
              ) : (
                <input
                  required={!["delivery_place"].includes(k)}
                  type={k.includes("phone") ? "tel" : "text"}
                  className={input}
                  value={form[k as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  maxLength={k.includes("phone") ? 40 : 500}
                />
              )}
            </label>
          ))}
        </div>
        <ul className="rounded-2xl bg-white p-5">
          {cart.map((i) => (
            <li
              key={`${i.type}-${i.id}`}
              className="flex justify-between border-b py-3"
            >
              <span>
                {i.quantity} × {i.name}
              </span>
              <span>${(Number(i.price) * i.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-600">
          Los precios finales y cualquier costo de entrega se revisarán al
          confirmar.
        </p>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={loading || !cart.length}
          className="w-full rounded-xl bg-blue-950 p-4 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Enviando…" : "Enviar solicitud pendiente de confirmación"}
        </button>
      </form>
    </main>
  );
}
