const fs = require("fs");
const path = require("path");

const target = path.join(process.cwd(), "components", "admin", "OrdersManager.tsx");

if (!fs.existsSync(target)) {
  console.error("❌ No encuentro components/admin/OrdersManager.tsx.");
  console.error("Ejecuta este script desde la raíz del proyecto.");
  process.exit(1);
}

let source = fs.readFileSync(target, "utf8");

const statusIndex = source.indexOf("const statusMessages");
const exportIndex = source.indexOf("export default function OrdersManager");

if (statusIndex === -1 || exportIndex === -1 || exportIndex <= statusIndex) {
  console.error("❌ No pude localizar el bloque de mensajes de estado en OrdersManager.tsx.");
  console.error('Busca manualmente "const statusMessages" para confirmar cómo está tu archivo local.');
  process.exit(1);
}

const functionStart = source.lastIndexOf("function ", statusIndex);

if (functionStart === -1) {
  console.error("❌ Encontré statusMessages, pero no pude localizar la función que lo contiene.");
  process.exit(1);
}

// La función de mensajes está justo antes del export principal de OrdersManager.
// Conservamos exactamente todo lo demás del archivo local.
const replacement = `function buildWhatsAppStatusMessage(order: any, newStatus: string) {
  const customer = getCustomer(order);
  const customerName = customer?.name || order.recipient_name || "cliente";

  const recipientName =
    order.recipient_name ||
    order.receiver_name ||
    order.delivery_recipient_name ||
    "No especificado";

  const orderNumber = getOrderNumber(order);
  const total = Number(order.total || 0).toFixed(2);

  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";

  const cleanOrderNumber = String(orderNumber).replace(/^#/, "");

  const trackingUrl = origin
    ? \`\${origin}/pedido/\${encodeURIComponent(cleanOrderNumber)}\`
    : \`/pedido/\${encodeURIComponent(cleanOrderNumber)}\`;

  const details =
    \`\\n\\n👤 Recibe: \${recipientName}\` +
    \`\\n\\n🔎 Consulta el estado de tu pedido:\\n\${trackingUrl}\`;

  const statusMessages: Record<string, string> = {
    pending: \`Hola \${customerName}, tu pedido \${orderNumber} está pendiente. Total: $\${total}. Te avisaremos cuando sea confirmado.\${details}\`,
    confirmed: \`Hola \${customerName}, tu pedido \${orderNumber} fue confirmado. Total: $\${total}. Ya estamos trabajando en él.\${details}\`,
    in_transit: \`Hola \${customerName}, tu pedido \${orderNumber} ya está en tránsito. Te avisaremos cuando sea entregado.\${details}\`,
    delivered: \`Hola \${customerName}, tu pedido \${orderNumber} fue marcado como entregado. Gracias por tu compra.\${details}\`,
    cancelled: \`Hola \${customerName}, tu pedido \${orderNumber} fue cancelado. Si tienes alguna duda, escríbenos por aquí.\${details}\`,
  };

  return (
    statusMessages[newStatus] ||
    \`Hola \${customerName}, el estado de tu pedido \${orderNumber} cambió a: \${getStatusLabel(
      newStatus
    )}.\${details}\`
  );
}

`;

const backup = target + ".bak-whatsapp";
if (!fs.existsSync(backup)) {
  fs.copyFileSync(target, backup);
}

source = source.slice(0, functionStart) + replacement + source.slice(exportIndex);

fs.writeFileSync(target, source, "utf8");

console.log("✅ Cambio aplicado correctamente.");
console.log("✅ Backup: components/admin/OrdersManager.tsx.bak-whatsapp");
console.log("Ahora ejecuta: npm run build");
