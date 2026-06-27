import type { DeliveryZone } from "@/lib/services/settings";
import type {
  CheckoutCartItem,
  CheckoutForm,
  CheckoutTotals,
} from "@/components/checkout/types";

export const CIENFUEGOS_MUNICIPALITIES = [
  "Cienfuegos",
  "Aguada de Pasajeros",
  "Rodas",
  "Palmira",
  "Lajas",
  "Cruces",
  "Cumanayagua",
  "Abreus",
];

export function calculateCheckoutTotals(
  cart: CheckoutCartItem[],
  selectedZone: DeliveryZone | null
): CheckoutTotals {
  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const minimumOrder = Number(selectedZone?.minimum_order || 0);
  const baseDeliveryFee = Number(selectedZone?.delivery_fee || 0);
  const freeDeliveryFrom = Number(selectedZone?.free_delivery_from || 0);

  const hasFreeDelivery =
    Boolean(selectedZone) && freeDeliveryFrom > 0 && subtotal >= freeDeliveryFrom;

  const shippingCost = selectedZone
    ? hasFreeDelivery
      ? 0
      : baseDeliveryFee
    : 0;

  const finalTotal = subtotal + shippingCost;
  const missingAmount = Math.max(minimumOrder - subtotal, 0);

  return {
    subtotal,
    minimumOrder,
    baseDeliveryFee,
    freeDeliveryFrom,
    hasFreeDelivery,
    shippingCost,
    finalTotal,
    missingAmount,
  };
}

export function isCheckoutFormComplete(
  form: CheckoutForm,
  cart: CheckoutCartItem[],
  selectedZone: DeliveryZone | null,
  totals: CheckoutTotals
) {
  return (
    cart.length > 0 &&
    Boolean(selectedZone) &&
    totals.subtotal >= totals.minimumOrder &&
    Boolean(form.name) &&
    Boolean(form.email) &&
    Boolean(form.phone) &&
    Boolean(form.recipient_name) &&
    Boolean(form.recipient_phone) &&
    Boolean(form.municipality) &&
    Boolean(form.delivery_zone_id) &&
    Boolean(form.exact_address)
  );
}

export function getOriginalCartItemId(cartId: string) {
  return cartId.replace("product-", "").replace("combo-", "");
}

export function buildWhatsappOrderMessage({
  orderId,
  orderNumber,
  form,
  cart,
  selectedZone,
  subtotal,
  shippingCost,
  finalTotal,
}: {
  orderId: string;
  orderNumber?: string;
  form: CheckoutForm;
  cart: CheckoutCartItem[];
  selectedZone: DeliveryZone;
  subtotal: number;
  shippingCost: number;
  finalTotal: number;
}) {
  const friendlyOrder = orderNumber || orderId;

  const orderSummary = cart
    .map((item, index) => {
      const icon = item.type === "combo" ? "🍱" : "📦";

      return `${index + 1}. ${icon} *${item.name}*
Cantidad: ${item.quantity}
Subtotal: $${(Number(item.price) * item.quantity).toFixed(2)}`;
    })
    .join("\n\n");

  return encodeURIComponent(`
🦅 *ÁGUILA CUBA EXPRESS*

━━━━━━━━━━━━━━

📦 *PEDIDO NUEVO*

🆔 *Orden:*
${friendlyOrder}

━━━━━━━━━━━━━━

👤 *CLIENTE*

Nombre:
${form.name}

Teléfono:
${form.phone}

Email:
${form.email}

━━━━━━━━━━━━━━

🎁 *DESTINATARIO EN CUBA*

Nombre:
${form.recipient_name}

Teléfono principal:
${form.recipient_phone}

${
  form.recipient_phone_alt
    ? `Teléfono alternativo:\n${form.recipient_phone_alt}`
    : ""
}

━━━━━━━━━━━━━━

📍 *ENTREGA*

País:
Cuba

Provincia:
Cienfuegos

Municipio:
${form.municipality}

Zona:
${selectedZone.zone_name}

Dirección:
${form.exact_address}

━━━━━━━━━━━━━━

🛒 *PRODUCTOS*

${orderSummary}

━━━━━━━━━━━━━━

💰 *RESUMEN*

Subtotal: $${subtotal.toFixed(2)}
Domicilio: $${shippingCost.toFixed(2)}

*TOTAL: $${finalTotal.toFixed(2)}*

━━━━━━━━━━━━━━

📝 *NOTAS*

${form.notes || "Sin notas"}

━━━━━━━━━━━━━━

Estado inicial:
🟡 Pendiente
`);
}