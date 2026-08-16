"use client";

import { useState } from "react";
import { Loader2, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

import { openWhatsAppMessage } from "@/lib/utils/whatsapp";
import { buildMenuOrderMessage, getCartTotal } from "@/lib/menu/whatsapp-message";
import PhoneCountryField from "@/components/checkout/PhoneCountryField";
import type { MenuCartLine, MenuOrderType } from "@/lib/menu/types";

type Props = {
  storeSlug: string;
  storeName: string;
  whatsappNumber: string | null;
  cart: MenuCartLine[];
  accentColor: string;
  initialTableNumber?: string;
  onClose: () => void;
  onUpdateQuantity: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  onOrderSent: () => void;
};

export default function MenuCartDrawer({
  storeSlug,
  storeName,
  whatsappNumber,
  cart,
  accentColor,
  initialTableNumber,
  onClose,
  onUpdateQuantity,
  onRemove,
  onOrderSent,
}: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [orderType, setOrderType] = useState<MenuOrderType>("dine_in");
  const [tableNumber, setTableNumber] = useState(initialTableNumber ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const total = getCartTotal(cart);

  const handleSend = async () => {
    if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 7) {
      setSubmitError("Completa tu nombre y un teléfono válido.");
      return;
    }
    if (orderType === "delivery" && !deliveryAddress.trim()) {
      setSubmitError("Escribe la dirección de entrega.");
      return;
    }
    if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setSubmitError("El correo no es válido.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/public/menu-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_slug: storeSlug,
          order_type: orderType,
          table_number: orderType === "dine_in" ? tableNumber.trim() : undefined,
          delivery_address: orderType === "delivery" ? deliveryAddress.trim() : undefined,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          customer_email: customerEmail.trim(),
          notes: customerNotes.trim(),
          lines: cart.map((line) => ({
            menu_item_id: line.menu_item_id,
            quantity: line.quantity,
            selected_options: line.selected_options,
            notes: line.notes || "",
          })),
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(body.error || "No se pudo enviar el pedido. Intenta de nuevo.");
        setSubmitting(false);
        return;
      }

      // La orden ya quedó guardada de verdad (con su inventario
      // descontado). WhatsApp es ahora el AVISO, no el único rastro
      // del pedido — si el negocio no configuró WhatsApp, igual el
      // pedido existe en su panel de Órdenes.
      if (whatsappNumber) {
        const message = buildMenuOrderMessage({
          storeName,
          cart,
          orderType,
          tableNumber: orderType === "dine_in" ? tableNumber.trim() || undefined : undefined,
          deliveryAddress: orderType === "delivery" ? deliveryAddress.trim() : undefined,
          customerName: customerName.trim() || undefined,
          customerNotes: customerNotes.trim() || undefined,
          deliveryFee: Number(body.total || total) - total,
        });
        openWhatsAppMessage({ app: "personal", phone: whatsappNumber, message });
      }

      setSubmitting(false);
      onOrderSent();
    } catch {
      setSubmitError("No se pudo enviar el pedido. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-[#FFFCF6] sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-[#1B1410]/10 p-5">
          <h2 className="flex items-center gap-2 text-lg text-[#1B1410]" style={{ fontFamily: "var(--menu-font-display)", fontWeight: 600 }}>
            <ShoppingBag size={20} />
            Tu pedido
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-[#1B1410]/40 hover:bg-[#1B1410]/5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {cart.length === 0 ? (
            <p className="py-10 text-center text-sm font-semibold text-[#1B1410]/45">
              Todavía no has agregado nada del menú.
            </p>
          ) : (
            <div className="space-y-3">
              {cart.map((line) => {
                const optionsTotal = line.selected_options.reduce(
                  (sum, opt) => sum + opt.price_delta,
                  0
                );
                const lineTotal = (line.unit_base_price + optionsTotal) * line.quantity;

                return (
                  <div key={line.lineId} className="rounded-2xl bg-[#1B1410]/[0.04] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#1B1410]">{line.name}</p>
                        {line.selected_options.map((opt) => (
                          <p key={opt.option_id} className="text-xs font-semibold text-[#1B1410]/55">
                            {opt.group_name}: {opt.option_label}
                          </p>
                        ))}
                        {line.notes && (
                          <p className="text-xs font-semibold italic text-[#1B1410]/45">
                            Nota: {line.notes}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => onRemove(line.lineId)}
                        className="shrink-0 text-[#1B1410]/35 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-[#1B1410]/15 bg-[#FFFCF6] px-2 py-1">
                        <button
                          onClick={() =>
                            onUpdateQuantity(line.lineId, Math.max(1, line.quantity - 1))
                          }
                          className="text-[#1B1410]/60"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-4 text-center text-xs font-bold text-[#1B1410]">
                          {line.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(line.lineId, line.quantity + 1)}
                          className="text-[#1B1410]/60"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-[#1B1410]">
                        ${lineTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="space-y-3 border-t border-[#1B1410]/10 p-5">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#1B1410]/50">
                ¿Cómo lo quieres?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType("dine_in")}
                  className="flex-1 rounded-full border py-2.5 text-xs font-bold uppercase tracking-wide transition"
                  style={
                    orderType === "dine_in"
                      ? { backgroundColor: accentColor, borderColor: accentColor, color: "#1B1410" }
                      : { borderColor: "rgba(27,20,16,0.15)", color: "rgba(27,20,16,0.6)" }
                  }
                >
                  Restaurante
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("takeaway")}
                  className="flex-1 rounded-full border py-2.5 text-xs font-bold uppercase tracking-wide transition"
                  style={
                    orderType === "takeaway"
                      ? { backgroundColor: accentColor, borderColor: accentColor, color: "#1B1410" }
                      : { borderColor: "rgba(27,20,16,0.15)", color: "rgba(27,20,16,0.6)" }
                  }
                >
                  Para llevar
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType("delivery")}
                  className="flex-1 rounded-full border py-2.5 text-xs font-bold uppercase tracking-wide transition"
                  style={
                    orderType === "delivery"
                      ? { backgroundColor: accentColor, borderColor: accentColor, color: "#1B1410" }
                      : { borderColor: "rgba(27,20,16,0.15)", color: "rgba(27,20,16,0.6)" }
                  }
                >
                  Domicilio
                </button>
              </div>
            </div>

            {orderType === "dine_in" && (
              <input
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="Número de mesa (si lo sabes)"
                className="w-full rounded-xl border border-[#1B1410]/15 px-3 py-2 text-sm font-semibold text-[#1B1410] outline-none focus:border-[#1B1410]/40"
              />
            )}

            {orderType === "delivery" && (
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Dirección de entrega"
                className="w-full rounded-xl border border-[#1B1410]/15 px-3 py-2 text-sm font-semibold text-[#1B1410] outline-none focus:border-[#1B1410]/40"
              />
            )}

            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Tu nombre"
              className="w-full rounded-xl border border-[#1B1410]/15 px-3 py-2 text-sm font-semibold text-[#1B1410] outline-none focus:border-[#1B1410]/40"
            />

            <PhoneCountryField
              name="customerPhone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Tu teléfono"
              className=""
            />

            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Correo (opcional, para confirmarte por ahí también)"
              className="w-full rounded-xl border border-[#1B1410]/15 px-3 py-2 text-sm font-semibold text-[#1B1410] outline-none focus:border-[#1B1410]/40"
            />

            <input
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Nota para tu pedido (opcional)"
              className="w-full rounded-xl border border-[#1B1410]/15 px-3 py-2 text-sm font-semibold text-[#1B1410] outline-none focus:border-[#1B1410]/40"
            />

            <div className="flex items-center justify-between text-sm font-bold text-[#1B1410]">
              <span>Total estimado</span>
              <span>${total.toFixed(2)}</span>
            </div>

            {submitError && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                {submitError}
              </p>
            )}

            <button
              onClick={handleSend}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold text-[#1B1410] shadow-sm transition disabled:opacity-60"
              style={{ backgroundColor: accentColor }}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Enviar pedido
            </button>
            <p className="text-center text-[11px] font-semibold text-[#1B1410]/45">
              Tu pedido queda registrado con {storeName}
              {whatsappNumber ? " y también se abre WhatsApp para avisarles." : "."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
