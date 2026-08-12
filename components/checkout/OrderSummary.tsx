import {
  Check,
  CreditCard,
  Loader2,
  LockKeyhole,
  MessageCircle,
  Package,
  ShoppingBag,
  Truck,
  ShieldCheck,
} from "lucide-react";
import type { DeliveryZone } from "@/lib/services/settings";
import type { CheckoutCartItem, CheckoutTotals } from "./types";
import {
  DiscountCouponBox,
  type AppliedDiscount,
} from "@/components/checkout/DiscountCouponBox";
import Price from "@/components/tienda/Price";
import { useCurrency } from "@/contexts/CurrencyContext";

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
}: Props) {
  const { currency } = useCurrency();
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
          <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
            La compra mínima para esta zona es de <Price usd={totals.minimumOrder} />.
            Te faltan <Price usd={totals.missingAmount} />.
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
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-500/10"
                  : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${payWith === "whatsapp" ? "bg-white/15" : "bg-emerald-50 text-emerald-600"}`}><MessageCircle size={19} /></span>
                <span><span className="block text-sm font-extrabold">WhatsApp</span><span className={`block text-[10px] font-semibold ${payWith === "whatsapp" ? "text-emerald-50" : "text-slate-400"}`}>Coordinar pedido</span></span>
              </div>
              {payWith === "whatsapp" && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-emerald-600"><Check size={12} strokeWidth={3.5} /></span>}
            </button>
          </div>
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
            : "bg-gradient-to-r from-emerald-500 to-green-600 shadow-green-600/25 hover:from-emerald-600 hover:to-green-700"
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
            <MessageCircle size={20} />
            Enviar pedido por WhatsApp
          </>
        )}
      </button>

      <div className="mt-3 flex items-center justify-center gap-2 text-center text-[11px] font-semibold text-slate-400">
        <ShieldCheck size={13} className="text-emerald-500" /> Tus datos se usan únicamente para procesar este pedido.
      </div>
    </aside>
  );
}
