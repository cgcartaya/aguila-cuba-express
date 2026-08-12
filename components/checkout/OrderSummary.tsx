import {
  CreditCard,
  Loader2,
  MessageCircle,
  Package,
  ShoppingBag,
  Truck,
} from "lucide-react";
import type { DeliveryZone } from "@/lib/services/settings";
import type { CheckoutCartItem, CheckoutTotals } from "./types";
import {
  DiscountCouponBox,
  type AppliedDiscount,
} from "@/components/checkout/DiscountCouponBox";

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
  const discountAmount = appliedDiscount?.discountAmount || 0;
  const finalTotal = Math.max(totals.finalTotal - discountAmount, 0);

  return (
    <aside className="h-fit min-w-0 overflow-hidden rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        Resumen de pedido
      </h2>

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
                  ${Number(item.price).toFixed(2)} c/u
                </span>

                {item.type === "product" &&
                  Number(item.base_price ?? item.price) >
                    Number(item.price) && (
                    <>
                      <span className="text-gray-400 line-through">
                        ${Number(item.base_price ?? item.price).toFixed(2)}
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
                ${(Number(item.price) * item.quantity).toFixed(2)}
              </p>

              {item.type === "product" &&
                Number(item.base_price ?? item.price) >
                  Number(item.price) && (
                  <p className="mt-1 text-[11px] font-bold text-emerald-700">
                    Ahorras $
                    {(
                      (Number(item.base_price ?? item.price) -
                        Number(item.price)) *
                      item.quantity
                    ).toFixed(2)}
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
          <span className="font-bold">${totals.subtotal.toFixed(2)}</span>
        </div>

        {showDelivery && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-gray-500">
              <Truck size={15} />
              {deliveryLabel}
            </span>
            <span className="font-bold">
              {deliveryRequiresZone && !selectedZone
                ? "Selecciona zona"
                : totals.shippingCost === 0
                  ? "Gratis"
                  : `$${totals.shippingCost.toFixed(2)}`}
            </span>
          </div>
        )}

        {appliedDiscount && (
          <div className="flex items-center justify-between font-bold text-green-700">
            <span>Descuento ({appliedDiscount.code})</span>
            <span>-${discountAmount.toFixed(2)}</span>
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
            La compra mínima para esta zona es de ${totals.minimumOrder.toFixed(2)}.
            Te faltan ${totals.missingAmount.toFixed(2)}.
          </div>
        )}
      </div>

      <div className="my-5 border-t" />

      <div className="mb-5 flex items-center justify-between text-lg font-bold">
        <span>Total</span>
        <span>${finalTotal.toFixed(2)}</span>
      </div>

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
        <div className="mb-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">¿Cómo prefieres pagar?</p>
          <div className="grid min-w-0 gap-2 min-[390px]:grid-cols-2">
            <button
              type="button"
              onClick={() => onChangePayWith?.("card")}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-bold transition ${
                payWith === "card" ? "border-blue-500 bg-blue-50 text-blue-800" : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <CreditCard size={17} /> Tarjeta
            </button>
            <button
              type="button"
              onClick={() => onChangePayWith?.("whatsapp")}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-2xl border-2 px-3 py-3 text-sm font-bold transition ${
                payWith === "whatsapp" ? "border-green-500 bg-green-50 text-green-800" : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <MessageCircle size={17} /> WhatsApp
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        aria-disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
          payWith === "card" ? "bg-blue-700 hover:bg-blue-800" : "bg-green-600 hover:bg-green-700"
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
    </aside>
  );
}
