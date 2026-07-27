import {
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
};

export function OrderSummary({
  cart,
  selectedZone,
  municipality,
  totals,
  error,
  loading,
  canCheckout,
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
}: Props) {
  const discountAmount = appliedDiscount?.discountAmount || 0;
  const finalTotal = Math.max(totals.finalTotal - discountAmount, 0);

  return (
    <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        Resumen de pedido
      </h2>

      <div className="space-y-3">
        {cart.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
            <div>
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
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-gray-500">Cantidad: {item.quantity}</p>
            </div>
            <p className="font-semibold">
              ${(Number(item.price) * item.quantity).toFixed(2)}
            </p>
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
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={loading || !canCheckout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Creando orden...
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
