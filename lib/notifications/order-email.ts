/* =========================================================
   EMAIL DE AVISO — NUEVA ORDEN

   Se llama desde create-order/route.ts justo después de crear la
   orden con éxito. Nunca debe tumbar la creación de la orden si
   el email falla — por eso el caller siempre debe envolver esto
   en try/catch y solo loguear el error, nunca responder con fail().

   Requiere las variables de entorno RESEND_API_KEY y
   RESEND_FROM_EMAIL. Si no están configuradas, o si la tienda no
   tiene un email de notificación configurado en Ajustes generales,
   simplemente no manda nada (silencioso, no es un error).
========================================================= */

type NewOrderEmailParams = {
  toEmails: string[];
  storeName: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemsCount: number;
  isLocalDelivery: boolean;
  municipality: string;
};

export async function sendNewOrderEmail(params: NewOrderEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    // No configurado todavía — no es un error, solo no se manda nada.
    return;
  }

  if (!params.toEmails || params.toEmails.length === 0) return;

  const deliveryLabel = params.isLocalDelivery
    ? `Entrega local${params.municipality ? ` — ${params.municipality}` : ""}`
    : `Envío a Cuba${params.municipality ? ` — ${params.municipality}` : ""}`;

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #061b3a;">Nuevo pedido en ${escapeHtml(params.storeName)}</h2>
      <p style="font-size: 15px; color: #334155;">
        Orden <strong>#${escapeHtml(params.orderNumber)}</strong>
      </p>
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse;">
        <tr><td style="padding: 4px 0;">Cliente</td><td style="text-align: right;"><strong>${escapeHtml(params.customerName)}</strong></td></tr>
        <tr><td style="padding: 4px 0;">Teléfono</td><td style="text-align: right;">${escapeHtml(params.customerPhone)}</td></tr>
        <tr><td style="padding: 4px 0;">Artículos</td><td style="text-align: right;">${params.itemsCount}</td></tr>
        <tr><td style="padding: 4px 0;">Entrega</td><td style="text-align: right;">${escapeHtml(deliveryLabel)}</td></tr>
        <tr><td style="padding: 4px 0; border-top: 1px solid #e2e8f0;">Productos</td><td style="text-align: right; padding: 4px 0; border-top: 1px solid #e2e8f0;">$${params.subtotal.toFixed(2)}</td></tr>
        <tr><td style="padding: 4px 0;">Envío</td><td style="text-align: right;">$${params.deliveryFee.toFixed(2)}</td></tr>
        <tr><td style="padding: 8px 0; font-size: 16px;"><strong>Total</strong></td><td style="text-align: right; padding: 8px 0; font-size: 16px;"><strong>$${params.total.toFixed(2)}</strong></td></tr>
      </table>
      <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
        Este es un aviso automático. Entra al panel de administración para ver el detalle completo y cambiar el estado del pedido.
      </p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: params.toEmails,
        subject: `Nuevo pedido #${params.orderNumber} — ${params.storeName}`,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("Error enviando email de nueva orden (Resend):", response.status, errorBody);
    }
  } catch (error) {
    console.error("Error de red enviando email de nueva orden:", error);
  }
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
