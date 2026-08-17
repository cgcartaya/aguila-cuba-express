"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { openWhatsAppMessage } from "@/lib/utils/whatsapp";
import { buildMenuOrderMessage, getCartTotal } from "@/lib/menu/whatsapp-message";
import PhoneCountryField from "@/components/checkout/PhoneCountryField";
import MenuUpsellSuggestions from "@/components/menu/MenuUpsellSuggestions";
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
  onEdit: (line: MenuCartLine) => void;
  onSuggestion: (itemId: string) => void;
  onOrderSent: () => void;
};

type Step = "cart" | "fulfillment" | "customer";

const ORDER_TYPES: {
  value: MenuOrderType;
  title: string;
  description: string;
  icon: typeof Store;
}[] = [
  {
    value: "dine_in",
    title: "En mesa",
    description: "Estoy en el restaurante",
    icon: UtensilsCrossed,
  },
  {
    value: "takeaway",
    title: "Recoger",
    description: "Paso a buscar mi pedido",
    icon: Store,
  },
  {
    value: "delivery",
    title: "Delivery",
    description: "Enviar a una dirección",
    icon: MapPin,
  },
];

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
  onEdit,
  onSuggestion,
  onOrderSent,
}: Props) {
  const [step, setStep] = useState<Step>("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [orderType, setOrderType] = useState<MenuOrderType>(
    initialTableNumber ? "dine_in" : "takeaway"
  );
  const [tableNumber, setTableNumber] = useState(initialTableNumber ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const total = getCartTotal(cart);
  const totalUnits = cart.reduce((sum, line) => sum + line.quantity, 0);
  const selectedOrderType = ORDER_TYPES.find((item) => item.value === orderType)!;

  const canContinueFulfillment = useMemo(() => {
    if (orderType === "delivery") return deliveryAddress.trim().length >= 5;
    return true;
  }, [orderType, deliveryAddress]);

  const handleSend = async () => {
    if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 7) {
      setSubmitError("Completa tu nombre y un teléfono válido.");
      return;
    }
    if (
      customerEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
    ) {
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
          table_number:
            orderType === "dine_in" ? tableNumber.trim() : undefined,
          delivery_address:
            orderType === "delivery" ? deliveryAddress.trim() : undefined,
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
        setSubmitError(
          body.error || "No se pudo enviar el pedido. Intenta de nuevo."
        );
        setSubmitting(false);
        return;
      }

      if (whatsappNumber) {
        const message = buildMenuOrderMessage({
          storeName,
          cart,
          orderType,
          tableNumber:
            orderType === "dine_in"
              ? tableNumber.trim() || undefined
              : undefined,
          deliveryAddress:
            orderType === "delivery"
              ? deliveryAddress.trim()
              : undefined,
          customerName: customerName.trim() || undefined,
          customerNotes: customerNotes.trim() || undefined,
          deliveryFee: Number(body.total || total) - total,
        });
        openWhatsAppMessage({
          app: "personal",
          phone: whatsappNumber,
          message,
        });
      }

      setSubmitting(false);
      onOrderSent();
    } catch {
      setSubmitError("No se pudo enviar el pedido. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  const stepIndex = step === "cart" ? 0 : step === "fulfillment" ? 1 : 2;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[30px] bg-[#FFFDF8] shadow-2xl sm:rounded-[30px]">
        <div className="border-b border-black/[0.07] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/35">
                Pedido en {storeName}
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-[#1B1410]">
                <ShoppingBag size={19} /> Tu pedido
              </h2>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-black/45"
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {["Pedido", "Entrega", "Datos"].map((label, index) => (
              <div key={label}>
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      index <= stepIndex
                        ? accentColor
                        : "rgba(27,20,16,.08)",
                  }}
                />
                <p
                  className={`mt-1 text-center text-[9px] font-black uppercase ${
                    index === stepIndex
                      ? "text-[#1B1410]"
                      : "text-black/30"
                  }`}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {step === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingBag size={32} className="mx-auto text-black/15" />
                  <p className="mt-3 text-sm font-bold text-black/40">
                    Todavía no has agregado nada.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {cart.map((line) => {
                      const optionsTotal = line.selected_options.reduce(
                        (sum, opt) => sum + opt.price_delta,
                        0
                      );
                      const unitTotal =
                        line.unit_base_price + optionsTotal;
                      const lineTotal = unitTotal * line.quantity;

                      return (
                        <article
                          key={line.lineId}
                          className="rounded-2xl border border-black/[0.07] bg-white p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="text-sm font-black text-[#1B1410]">
                                    {line.name}
                                  </h3>
                                  <p className="mt-0.5 text-xs font-bold text-black/40">
                                    ${unitTotal.toFixed(2)} c/u
                                  </p>
                                </div>
                                <strong className="shrink-0 text-sm text-[#1B1410]">
                                  ${lineTotal.toFixed(2)}
                                </strong>
                              </div>

                              {line.selected_options.length > 0 && (
                                <div className="mt-3 space-y-1">
                                  {line.selected_options.map((opt) => (
                                    <div
                                      key={`${opt.group_id}-${opt.option_id}`}
                                      className="flex items-center justify-between gap-3 text-xs"
                                    >
                                      <span className="font-semibold text-black/50">
                                        {opt.group_name}:{" "}
                                        <strong className="text-black/70">
                                          {opt.option_label}
                                        </strong>
                                      </span>
                                      {opt.price_delta !== 0 && (
                                        <span className="shrink-0 font-black text-black/40">
                                          {opt.price_delta > 0 ? "+" : "−"}$
                                          {Math.abs(
                                            opt.price_delta
                                          ).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {line.notes && (
                                <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
                                  Cocina: {line.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center rounded-full border border-black/10 bg-[#FFFCF6] p-1">
                              <button
                                onClick={() => {
                                  if (line.quantity <= 1)
                                    onRemove(line.lineId);
                                  else
                                    onUpdateQuantity(
                                      line.lineId,
                                      line.quantity - 1
                                    );
                                }}
                                className="flex h-7 w-7 items-center justify-center text-black/55"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="w-7 text-center text-xs font-black">
                                {line.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  onUpdateQuantity(
                                    line.lineId,
                                    line.quantity + 1
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center text-black/55"
                              >
                                <Plus size={13} />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onEdit(line)}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600"
                              >
                                <Edit3 size={12} /> Editar
                              </button>
                              <button
                                onClick={() => onRemove(line.lineId)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <MenuUpsellSuggestions
                    storeSlug={storeSlug}
                    cartItemIds={cart.map((line) => line.menu_item_id)}
                    accentColor={accentColor}
                    onSelect={onSuggestion}
                  />
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-black/[0.07] bg-[#FFFDF8] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-black/40">
                      {totalUnits} artículos
                    </p>
                    <p className="text-sm font-black text-[#1B1410]">
                      Subtotal
                    </p>
                  </div>
                  <strong className="text-xl text-[#1B1410]">
                    ${total.toFixed(2)}
                  </strong>
                </div>

                <button
                  onClick={() => setStep("fulfillment")}
                  className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black"
                  style={{
                    backgroundColor: accentColor,
                    color: "#1B1410",
                  }}
                >
                  Continuar <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}

        {step === "fulfillment" && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <button
                onClick={() => setStep("cart")}
                className="mb-4 inline-flex items-center gap-1 text-xs font-black text-black/45"
              >
                <ChevronLeft size={14} /> Volver al pedido
              </button>

              <h3 className="text-xl font-black text-[#1B1410]">
                ¿Cómo quieres recibirlo?
              </h3>

              <div className="mt-5 space-y-3">
                {ORDER_TYPES.map(
                  ({ value, title, description, icon: Icon }) => {
                    const selected = value === orderType;
                    return (
                      <button
                        key={value}
                        onClick={() => {
                          setOrderType(value);
                          setSubmitError(null);
                        }}
                        className="flex w-full items-center gap-4 rounded-2xl border p-4 text-left"
                        style={
                          selected
                            ? {
                                borderColor: accentColor,
                                backgroundColor: `${accentColor}14`,
                              }
                            : {
                                borderColor: "rgba(27,20,16,.08)",
                                backgroundColor: "white",
                              }
                        }
                      >
                        <span
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                          style={
                            selected
                              ? {
                                  backgroundColor: accentColor,
                                  color: "#1B1410",
                                }
                              : {
                                  backgroundColor:
                                    "rgba(27,20,16,.05)",
                                  color: "rgba(27,20,16,.5)",
                                }
                          }
                        >
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block text-sm text-[#1B1410]">
                            {title}
                          </strong>
                          <span className="mt-0.5 block text-xs font-semibold text-black/40">
                            {description}
                          </span>
                        </span>
                        {selected && (
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-full"
                            style={{ backgroundColor: accentColor }}
                          >
                            <Check size={13} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {orderType === "dine_in" && (
                <input
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Número de mesa"
                  readOnly={Boolean(initialTableNumber)}
                  className="mt-5 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"
                />
              )}

              {orderType === "delivery" && (
                <input
                  value={deliveryAddress}
                  onChange={(e) =>
                    setDeliveryAddress(e.target.value)
                  }
                  placeholder="Dirección de entrega"
                  className="mt-5 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold outline-none"
                />
              )}

              {submitError && (
                <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                  {submitError}
                </p>
              )}
            </div>

            <div className="border-t border-black/[0.07] p-5">
              <button
                onClick={() => {
                  if (
                    orderType === "delivery" &&
                    deliveryAddress.trim().length < 5
                  ) {
                    setSubmitError(
                      "Escribe una dirección de entrega válida."
                    );
                    return;
                  }
                  setSubmitError(null);
                  setStep("customer");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black"
                style={{
                  backgroundColor: accentColor,
                  color: "#1B1410",
                }}
              >
                Continuar <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}

        {step === "customer" && (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <button
                onClick={() => setStep("fulfillment")}
                className="mb-4 inline-flex items-center gap-1 text-xs font-black text-black/45"
              >
                <ChevronLeft size={14} /> Cambiar entrega
              </button>

              <h3 className="text-xl font-black text-[#1B1410]">
                Tus datos
              </h3>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase text-black/35">
                  Método seleccionado
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <selectedOrderType.icon size={15} />
                  <strong className="text-sm">
                    {selectedOrderType.title}
                  </strong>
                  {orderType === "dine_in" && tableNumber && (
                    <span className="text-xs font-bold text-black/40">
                      · Mesa {tableNumber}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
                />

                <PhoneCountryField
                  name="customerPhone"
                  value={customerPhone}
                  onChange={(e) =>
                    setCustomerPhone(e.target.value)
                  }
                  placeholder="Tu teléfono"
                  className=""
                />

                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Correo (opcional)"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
                />

                <textarea
                  value={customerNotes}
                  onChange={(e) =>
                    setCustomerNotes(e.target.value)
                  }
                  placeholder="Nota general para el pedido (opcional)"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
                />
              </div>

              {submitError && (
                <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600">
                  {submitError}
                </p>
              )}
            </div>

            <div className="border-t border-black/[0.07] bg-[#FFFDF8] p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-black text-[#1B1410]">
                  Total estimado
                </span>
                <strong className="text-xl text-[#1B1410]">
                  ${total.toFixed(2)}
                </strong>
              </div>

              <button
                onClick={handleSend}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-black disabled:opacity-60"
                style={{
                  backgroundColor: accentColor,
                  color: "#1B1410",
                }}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : null}
                Confirmar pedido
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
