import {
  Check,
  CreditCard,
  Loader2,
  LockKeyhole,
  Package,
  Plus,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Copy,
  Zap,
} from "lucide-react";
import type { DeliveryZone } from "@/lib/services/settings";
import type { CheckoutCartItem, CheckoutTotals } from "./types";
import {
  DiscountCouponBox,
  type AppliedDiscount,
} from "@/components/checkout/DiscountCouponBox";
import Price from "@/components/tienda/Price";
import { useCurrency } from "@/contexts/CurrencyContext";
import ZelleIcon from "@/components/checkout/ZelleIcon";

type Props = {
  cart: CheckoutCartItem[];
  selectedZone: DeliveryZone | null;
  municipality: string;
  totals: CheckoutTotals;
  error: string;
  loading: boolean;
  canCheckout: boolean;
  missingFields?: string[];
  onSubmit: () => void;
  storeId: string;
  customerPhone: string;
  appliedDiscount: AppliedDiscount | null;
  onApplyDiscount: (discount: AppliedDiscount) => void;
  onRemoveDiscount: () => void;
  showCoupon?: boolean;
  showDelivery?: boolean;
  deliveryLabel?: string;
  deliveryRequiresZone?: boolean;
  locationLabel?: string;
  cardPaymentAvailable?: boolean;
  payWith?: "whatsapp" | "card";
  onChangePayWith?: (value: "whatsapp" | "card") => void;
  /** Correo o teléfono de Zelle del negocio, para mostrarlo en las instrucciones de pago. */
  zelleInfo?: string;
  onAddProducts?: () => void;
};

export function OrderSummary({
  cart,
  selectedZone,
  municipality,
  totals,
  error,
  loading,
  canCheckout,
  missingFields = [],
  onSubmit,
  storeId,
  customerPhone,
  appliedDiscount,
  onApplyDiscount,
  onRemoveDiscount,
  showCoupon = true,
  showDelivery = true,
  deliveryLabel = "Domicilio",
  deliveryRequiresZone = true,
  locationLabel,
  cardPaymentAvailable = false,
  payWith = "whatsapp",
  onChangePayWith,
  zelleInfo,
  onAddProducts,
}: Props) {
  const { currency, format } = useCurrency();
  const discountAmount = appliedDiscount?.discountAmount || 0;
  const finalTotal = Math.max(totals.finalTotal - discountAmount, 0);

  return (
    <aside className="h-fit min-w-0 overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] lg:sticky lg:top-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">Tu compra</p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Resumen del pedido</h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><ShoppingBag size={19} /></span>
      </div>

      <div className="space-y-3">
        {cart.map((item) => (
          <div key={item.id} className="flex min-w-0 items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <span
                className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${
                  item.type === "combo"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {item.type === "combo" ? <Package size={11} /> : <ShoppingBag size={11} />}
                {item.type === "combo" ? "Combo" : "Producto"}
              </span>
              <p className="break-words font-medium text-gray-900">{item.name}</p>
              <p className="text-gray-500">Cantidad: {item.quantity}</p>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-gray-600">
                  <Price usd={Number(item.price)} /> c/u
                </span>

                {item.type === "product" &&
                  Number(item.base_price ?? item.price) >
                    Number(item.price) && (
                    <>
                      <span className="text-gray-400 line-through">
                        <Price usd={Number(item.base_price ?? item.price)} />
                      </span>

                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-black text-emerald-700">
                        Precio por cantidad
                      </span>
                    </>
                  )}
              </div>

              {item.type === "product" &&
                item.max_quantity_per_order != null && (
                  <p className="mt-1 text-[11px] font-bold text-amber-700">
                    Máximo {item.max_quantity_per_order} por pedido
                  </p>
                )}
            </div>

            <div className="shrink-0 text-right">
              <p className="font-semibold">
                <Price usd={Number(item.price) * item.quantity} />
              </p>

              {item.type === "product" &&
                Number(item.base_price ?? item.price) >
                  Number(item.price) && (
                  <p className="mt-1 text-[11px] font-bold text-emerald-700">
                    Ahorras{" "}
                    <Price
                      usd={
                        (Number(item.base_price ?? item.price) -
                          Number(item.price)) *
                        item.quantity
                      }
                    />
                  </p>
                )}
            </div>
          </div>
        ))}
      </div>

      {showCoupon && (
        <>
          <div className="my-5 border-t" />
          <DiscountCouponBox
            storeId={storeId}
            phone={customerPhone}
            subtotal={totals.subtotal}
            appliedDiscount={appliedDiscount}
            onApply={onApplyDiscount}
            onRemove={onRemoveDiscount}
          />
        </>
      )}

      <div className="my-5 border-t" />

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-bold"><Price usd={totals.subtotal} /></span>
        </div>

        {showDelivery && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-500">
              <Truck size={15} />
              {deliveryLabel}
            </span>
            <span className="font-bold">
              {deliveryRequiresZone && !selectedZone ? (
                "Selecciona zona"
              ) : totals.shippingCost === 0 ? (
                "Gratis"
              ) : (
                <Price usd={totals.shippingCost} />
              )}
            </span>
          </div>
        )}

        {appliedDiscount && (
          <div className="flex items-center justify-between font-bold text-green-700">
            <span>Descuento ({appliedDiscount.code})</span>
            <span>-<Price usd={discountAmount} /></span>
          </div>
        )}

        {(locationLabel || selectedZone) && (
          <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
            <strong>
              {locationLabel || `${municipality} / ${selectedZone?.zone_name}`}
            </strong>
          </div>
        )}

        {totals.minimumOrderExempt && (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            Este pedido no requiere compra mínima.
          </div>
        )}

        {totals.deliveryIncludedForAllItems && (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            Entrega incluida en el precio de los productos.
          </div>
        )}

        {selectedZone && totals.subtotal < totals.minimumOrder && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            <p>La compra mínima para esta zona es de <Price usd={totals.minimumOrder} />.</p>
            <p className="mt-1">Te faltan <Price usd={totals.missingAmount} />.</p>
            {onAddProducts && (
              <button type="button" onClick={onAddProducts} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-black text-white shadow-sm hover:bg-blue-700">
                <Plus size={17} /> Agregar productos
              </button>
            )}
          </div>
        )}
      </div>

      <div className="my-5 border-t" />

      <div className="flex items-center justify-between text-lg font-bold">
        <span>Total</span>
        <span><Price usd={finalTotal} /></span>
      </div>

      {currency !== "USD" && (
        <p className="mt-1 text-right text-[11px] font-semibold text-gray-400">
          ≈ ${finalTotal.toFixed(2)} USD — el cobro se hace en dólares
        </p>
      )}

      <div className="mb-5" />

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}

      {!canCheckout && missingFields.length > 0 && !error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">Antes de enviar, completa:</p>
          <p className="mt-1">{missingFields.join(", ")}.</p>
        </div>
      )}

      {cardPaymentAvailable && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Forma de pago</p>
              <p className="mt-1 text-sm font-bold text-slate-900">Elige la opción que prefieras</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700"><LockKeyhole size={11} /> Seguro</span>
          </div>

          <div className="grid min-w-0 gap-2.5 min-[390px]:grid-cols-2">
            <button
              type="button"
              onClick={() => onChangePayWith?.("card")}
              className={`group relative min-w-0 overflow-hidden rounded-2xl border-2 p-3.5 text-left transition-all ${
                payWith === "card"
                  ? "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/20 ring-4 ring-blue-600/10"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${payWith === "card" ? "bg-white/15" : "bg-blue-50 text-blue-600"}`}><CreditCard size={19} /></span>
                <span className="min-w-0"><span className="block text-sm font-extrabold">Tarjeta</span><span className={`block truncate text-[10px] font-semibold ${payWith === "card" ? "text-blue-100" : "text-slate-400"}`}>Visa · Mastercard · Amex</span></span>
              </div>
              {payWith === "card" && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-blue-600"><Check size={12} strokeWidth={3.5} /></span>}
            </button>

            <button
              type="button"
              onClick={() => onChangePayWith?.("whatsapp")}
              className={`group relative min-w-0 overflow-hidden rounded-2xl border-2 p-3.5 text-left transition-all ${
                payWith === "whatsapp"
                  ? "border-purple-600 bg-purple-600 text-white shadow-lg shadow-purple-600/20 ring-4 ring-purple-600/10"
                  : "border-slate-200 bg-white text-slate-700 hover:border-purple-300 hover:bg-purple-50/40"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${payWith === "whatsapp" ? "bg-white/15" : "bg-purple-50 text-purple-600"}`}><ZelleIcon size={19} /></span>
                <span><span className="block text-sm font-extrabold">Zelle</span><span className={`block text-[10px] font-semibold ${payWith === "whatsapp" ? "text-purple-100" : "text-slate-400"}`}>Transferencia</span></span>
              </div>
              {payWith === "whatsapp" && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-purple-600"><Check size={12} strokeWidth={3.5} /></span>}
            </button>
          </div>

          {/* Instrucciones — cambian según el método elegido, para que a nadie
              se le quede pendiente sin darse cuenta de qué falta por hacer. */}
          {payWith === "card" ? (
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-blue-50 px-3.5 py-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><Zap size={12} /></span>
              <p className="text-xs font-semibold leading-relaxed text-blue-900">
                Pagas ahora mismo con tu tarjeta, de forma segura. En cuanto confirmes verás
                tu pedido aprobado al instante — no tienes que hacer nada más.
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-2xl bg-purple-50 px-3.5 py-3">
              <p className="mb-2 text-xs font-extrabold text-purple-900">Así se paga con Zelle:</p>
              <ol className="space-y-2 text-xs font-semibold text-purple-900">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-black text-white">1</span>
                  <span>
                    Abre tu banco o la app de Zelle y envía <strong><Price usd={finalTotal} /></strong> a:{" "}
                    {zelleInfo ? (
                      <span className="mt-1 flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 font-mono text-[11px] text-purple-800 shadow-sm">
                        <Copy size={11} className="shrink-0 text-purple-400" />
                        {zelleInfo}
                      </span>
                    ) : (
                      "el Zelle de la tienda (te lo confirmamos por WhatsApp)"
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-black text-white">2</span>
                  <span>Toca el botón de abajo para enviarnos tu pedido por WhatsApp.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-black text-white">3</span>
                  <span>Adjunta ahí mismo la captura del envío — así confirmamos tu pago y procesamos el pedido.</span>
                </li>
              </ol>
              <p className="mt-2.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-[10.5px] font-bold text-amber-800">
                Tu pedido queda pendiente hasta que confirmes el pago por WhatsApp.
              </p>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        aria-disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
          payWith === "card"
            ? "bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-600/25 hover:from-blue-700 hover:to-indigo-800"
            : "bg-gradient-to-r from-purple-600 to-violet-700 shadow-purple-600/25 hover:from-purple-700 hover:to-violet-800"
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            {payWith === "card" ? "Preparando el pago..." : "Creando orden..."}
          </>
        ) : payWith === "card" ? (
          <>
            <CreditCard size={20} />
            Pagar con tarjeta
          </>
        ) : (
          <>
            <ZelleIcon size={20} />
            Ya pagué por Zelle, enviar pedido
          </>
        )}
      </button>

      <div className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] font-semibold text-slate-400">
        <ShieldCheck size={13} className="text-emerald-500" /> Tus datos se usan únicamente para procesar este pedido.
      </div>
    </aside>
  );
}
