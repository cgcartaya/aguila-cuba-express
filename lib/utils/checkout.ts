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

  const shippingCost = selectedZone ? (hasFreeDelivery ? 0 : baseDeliveryFee) : 0;

  return {
    subtotal,
    minimumOrder,
    baseDeliveryFee,
    freeDeliveryFrom,
    hasFreeDelivery,
    shippingCost,
    finalTotal: subtotal + shippingCost,
    missingAmount: Math.max(minimumOrder - subtotal, 0),
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
  orderNumber,
  form,
  cart,
  selectedZone,
  subtotal,
  shippingCost,
  finalTotal,
  orderUrl,
}: {
  orderNumber: string;
  form: CheckoutForm;
  cart: CheckoutCartItem[];
  selectedZone: DeliveryZone;
  subtotal: number;
  shippingCost: number;
  finalTotal: number;
  orderUrl: string;
}) {
  const productsText = cart
    .map((item) => {
      const label = item.type === "combo" ? "Combo" : "Producto";
      const lineTotal = Number(item.price) * item.quantity;

      return `${item.quantity}x ${item.name} (${label}): $${lineTotal.toFixed(
        2
      )}`;
    })
    .join("\n");

  const date = new Date().toLocaleString("es-US", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return encodeURIComponent(`
AGUILA CUBA EXPRESS
--------------------

PEDIDO NUEVO

Orden:
${orderNumber}

Fecha:
${date}

--------------------

CLIENTE

Nombre:
${form.name}

Teléfono:
${form.phone}

Email:
${form.email}

--------------------

DESTINATARIO EN CUBA

Nombre:
${form.recipient_name}

Teléfono principal:
${form.recipient_phone}

${
  form.recipient_phone_alt
    ? `Teléfono alternativo:\n${form.recipient_phone_alt}`
    : ""
}

--------------------

ENTREGA

Provincia:
Cienfuegos

Municipio:
${form.municipality}

Zona:
${selectedZone.zone_name}

Dirección:
${form.exact_address}

--------------------

PRODUCTOS

${productsText}

--------------------

RESUMEN

Subtotal: $${subtotal.toFixed(2)}
Domicilio: $${shippingCost.toFixed(2)}

TOTAL: $${finalTotal.toFixed(2)}

Estado:
Pendiente

Pago:
Pendiente de confirmar

--------------------

NOTAS

${form.notes || "Sin notas"}

--------------------

Ver pedido:
${orderUrl}
`);
}