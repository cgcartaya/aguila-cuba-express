import type { MenuCartLine } from "@/lib/menu/types";

function formatMoney(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function lineTotal(line: MenuCartLine) {
  const optionsTotal = line.selected_options.reduce(
    (sum, opt) => sum + opt.price_delta,
    0
  );
  return (line.unit_base_price + optionsTotal) * line.quantity;
}

export function getCartTotal(cart: MenuCartLine[]) {
  return cart.reduce((sum, line) => sum + lineTotal(line), 0);
}

/**
 * Arma el texto del pedido para enviar por WhatsApp (mismo patrón
 * que ya usa tienda con openWhatsAppMessage de lib/utils/whatsapp.ts,
 * solo cambia cómo se construye el mensaje).
 */
export function buildMenuOrderMessage({
  storeName,
  cart,
  orderType,
  tableNumber,
  deliveryAddress,
  customerName,
  customerNotes,
  deliveryFee = 0,
}: {
  storeName: string;
  cart: MenuCartLine[];
  orderType: "dine_in" | "takeaway" | "delivery";
  tableNumber?: string;
  deliveryAddress?: string;
  customerName?: string;
  customerNotes?: string;
  deliveryFee?: number;
}) {
  const lines: string[] = [];

  lines.push(`¡Hola ${storeName}! Quisiera hacer este pedido:`);
  lines.push("");

  if (orderType === "dine_in") {
    lines.push(`Tipo de pedido: En el restaurante${tableNumber ? ` — Mesa ${tableNumber}` : ""}`);
  } else if (orderType === "delivery") {
    lines.push(`Tipo de pedido: Domicilio${deliveryAddress ? ` — ${deliveryAddress}` : ""}`);
  } else {
    lines.push("Tipo de pedido: Para llevar");
  }
  lines.push("");

  cart.forEach((line) => {
    lines.push(`• ${line.quantity}x ${line.name} — ${formatMoney(lineTotal(line))}`);
    line.selected_options.forEach((opt) => {
      lines.push(`   - ${opt.group_name}: ${opt.option_label}`);
    });
    if (line.notes) {
      lines.push(`   - Nota: ${line.notes}`);
    }
  });

  lines.push("");
  if (deliveryFee > 0) {
    lines.push(`Subtotal: ${formatMoney(getCartTotal(cart))}`);
    lines.push(`Domicilio: ${formatMoney(deliveryFee)}`);
    lines.push(`Total estimado: ${formatMoney(getCartTotal(cart) + deliveryFee)}`);
  } else {
    lines.push(`Total estimado: ${formatMoney(getCartTotal(cart))}`);
  }

  if (customerName) {
    lines.push("");
    lines.push(`Nombre: ${customerName}`);
  }
  if (customerNotes) {
    lines.push(`Nota general: ${customerNotes}`);
  }

  return lines.join("\n");
}
