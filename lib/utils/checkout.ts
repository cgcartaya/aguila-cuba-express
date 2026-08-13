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

  // La orden completa queda exenta del mínimo únicamente cuando
  // TODOS sus artículos son exentos. En una orden mixta, el subtotal
  // completo (incluidos los productos exentos como cakes) cuenta para
  // alcanzar el mínimo de la zona.
  const minimumOrderExempt =
    cart.length > 0 &&
    cart.every(
      (item) => item.minimum_order_exempt === true
    );

  const deliveryIncludedForAllItems =
    cart.length > 0 &&
    cart.every(
      (item) => item.delivery_included === true
    );

  const minimumOrder = minimumOrderExempt
    ? 0
    : Number(selectedZone?.minimum_order || 0);
  const baseDeliveryFee = Number(selectedZone?.delivery_fee || 0);
  const freeDeliveryFrom = Number(selectedZone?.free_delivery_from || 0);

  const hasFreeDelivery =
    deliveryIncludedForAllItems ||
    (Boolean(selectedZone) && freeDeliveryFrom > 0 && subtotal >= freeDeliveryFrom);

  const shippingCost = selectedZone
    ? deliveryIncludedForAllItems
      ? 0
      : hasFreeDelivery
        ? 0
        : baseDeliveryFee
    : 0;

  return {
    subtotal,
    minimumOrder,
    baseDeliveryFee,
    freeDeliveryFrom,
    hasFreeDelivery,
    shippingCost,
    finalTotal: subtotal + shippingCost,
    missingAmount: Math.max(minimumOrder - subtotal, 0),
    minimumOrderExempt,
    deliveryIncludedForAllItems,
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

// Arma el mismo mensaje que buildWhatsappOrderMessage, pero a partir de una
// orden YA GUARDADA en la base de datos (con sus order_items y su cliente
// ya vinculado) en vez del estado del carrito en vivo. Se usa para poder
// compartir por WhatsApp una orden que se pagó con tarjeta — esas nunca
// pasan por el flujo normal de "armar mensaje y enviarlo", porque el
// cliente fue directo a Stripe en vez de a WhatsApp.
export function buildWhatsappOrderMessageFromDbOrder({
  order,
  customer,
  orderItems,
  orderUrl,
}: {
  order: {
    order_number?: string | null;
    id: string;
    created_at: string;
    recipient_name?: string | null;
    recipient_phone?: string | null;
    recipient_phone_alt?: string | null;
    municipality?: string | null;
    zone_name?: string | null;
    exact_address?: string | null;
    subtotal?: number | null;
    delivery_fee?: number | null;
    discount_code?: string | null;
    discount_amount?: number | null;
    total?: number | null;
    payment_status?: string | null;
    payment_method?: string | null;
    notes?: string | null;
  };
  customer?: { name?: string | null; phone?: string | null; email?: string | null } | null;
  orderItems: Array<{ item_type?: string | null; product_name?: string | null; quantity?: number | null; subtotal?: number | null }>;
  orderUrl: string;
}) {
  const productsText = orderItems
    .map((item) => {
      const label = item.item_type === "combo" ? "Combo" : "Producto";
      const lineTotal = Number(item.subtotal || 0);

      return `${item.quantity || 0}x ${item.product_name || ""} (${label}): $${lineTotal.toFixed(2)}`;
    })
    .join("\n");

  const date = new Date(order.created_at).toLocaleString("es-US", {
    dateStyle: "short",
    timeStyle: "short",
  });

  const paymentLabel =
    order.payment_method === "card"
      ? order.payment_status === "paid"
        ? "Pagado con tarjeta"
        : "Tarjeta — sin confirmar todavía"
      : "Pendiente de confirmar";

  return `
AGUILA EXPRESS USA
--------------------

PEDIDO NUEVO

Orden:
${order.order_number || order.id}

Fecha:
${date}

--------------------

CLIENTE

Nombre:
${customer?.name || ""}

Teléfono:
${customer?.phone || ""}

Email:
${customer?.email || ""}

--------------------

DESTINATARIO EN CUBA

Nombre:
${order.recipient_name || ""}

Teléfono principal:
${order.recipient_phone || ""}

${
  order.recipient_phone_alt
    ? `Teléfono alternativo:\n${order.recipient_phone_alt}`
    : ""
}

--------------------

ENTREGA

Provincia:
Cienfuegos

Municipio:
${order.municipality || ""}

Zona:
${order.zone_name || ""}

Dirección:
${order.exact_address || ""}

--------------------

PRODUCTOS

${productsText}

--------------------

RESUMEN

Subtotal: $${Number(order.subtotal || 0).toFixed(2)}
Domicilio: $${Number(order.delivery_fee || 0).toFixed(2)}
${order.discount_code ? `Descuento (${order.discount_code}): -$${Number(order.discount_amount || 0).toFixed(2)}` : ""}

TOTAL: $${Number(order.total || 0).toFixed(2)}

Estado:
Pendiente

Pago:
${paymentLabel}

--------------------

NOTAS

${order.notes || "Sin notas"}

--------------------

Ver pedido:
${orderUrl}
`;
}

export function buildWhatsappOrderMessage({
  orderNumber,
  form,
  cart,
  selectedZone,
  subtotal,
  shippingCost,
  finalTotal,
  discountCode,
  discountAmount,
  orderUrl,
}: {
  orderNumber: string;
  form: CheckoutForm;
  cart: CheckoutCartItem[];
  selectedZone: DeliveryZone;
  subtotal: number;
  shippingCost: number;
  finalTotal: number;
  discountCode?: string | null;
  discountAmount?: number;
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
AGUILA EXPRESS USA
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
${discountCode ? `Descuento (${discountCode}): -$${Number(discountAmount || 0).toFixed(2)}` : ""}

TOTAL: $${finalTotal.toFixed(2)}

Estado:
Pendiente

Pago:
Zelle - Pendiente de confirmar (revisa el comprobante adjunto en el chat)

--------------------

NOTAS

${form.notes || "Sin notas"}

--------------------

Ver pedido:
${orderUrl}
`);
}