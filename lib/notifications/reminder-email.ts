/* =========================================================
   EMAILS DE RECORDATORIO — carrito abandonado y orden sin pagar.

   Mismo patrón que lib/notifications/order-email.ts: usa Resend,
   nunca lanza (siempre se llama desde el cron y no debe tumbarlo si
   un envío falla), y si RESEND_API_KEY/RESEND_FROM_EMAIL no están
   configurados simplemente no manda nada.
========================================================= */

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendEmail(params: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail || !params.to) return { sent: false };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error("Error enviando email de recordatorio (Resend):", response.status, errorBody);
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    console.error("Error de red enviando email de recordatorio:", error);
    return { sent: false };
  }
}

type CartItem = { name: string; quantity: number; price: number };

export async function sendAbandonedCartEmail(params: {
  to: string;
  storeName: string;
  customerName: string;
  items: CartItem[];
  subtotal: number;
  checkoutUrl: string;
}) {
  const itemsRows = params.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 6px 0;">${escapeHtml(item.name)} × ${item.quantity}</td>
          <td style="text-align: right; padding: 6px 0;">$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const greetingName = params.customerName ? escapeHtml(params.customerName) : "";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #061b3a;">${greetingName ? `Hola ${greetingName}, tu` : "Tu"} carrito te está esperando</h2>
      <p style="font-size: 15px; color: #334155;">
        Dejaste estos productos en ${escapeHtml(params.storeName)} sin terminar la compra:
      </p>
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse;">
        ${itemsRows}
        <tr><td style="padding: 8px 0; border-top: 1px solid #e2e8f0; font-size: 16px;"><strong>Subtotal</strong></td><td style="text-align: right; padding: 8px 0; border-top: 1px solid #e2e8f0; font-size: 16px;"><strong>$${params.subtotal.toFixed(2)}</strong></td></tr>
      </table>
      <a href="${params.checkoutUrl}" style="display: inline-block; margin-top: 20px; padding: 12px 20px; background: #061b3a; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold;">
        Terminar mi compra
      </a>
      <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
        Si ya no te interesa, puedes ignorar este correo.
      </p>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Dejaste algo en tu carrito — ${params.storeName}`,
    html,
  });
}

export async function sendUnpaidOrderEmail(params: {
  to: string;
  storeName: string;
  customerName: string;
  orderNumber: string;
  total: number;
  orderUrl: string;
}) {
  const greetingName = params.customerName ? escapeHtml(params.customerName) : "";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #061b3a;">${greetingName ? `Hola ${greetingName}, tu` : "Tu"} pedido sigue pendiente de pago</h2>
      <p style="font-size: 15px; color: #334155;">
        Tu pedido <strong>#${escapeHtml(params.orderNumber)}</strong> en ${escapeHtml(params.storeName)}
        por <strong>$${params.total.toFixed(2)}</strong> todavía no se ha pagado.
      </p>
      <a href="${params.orderUrl}" style="display: inline-block; margin-top: 12px; padding: 12px 20px; background: #061b3a; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold;">
        Ver y pagar mi pedido
      </a>
      <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
        Si ya lo pagaste o ya no lo quieres, puedes ignorar este correo.
      </p>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Pedido #${params.orderNumber} pendiente de pago — ${params.storeName}`,
    html,
  });
}
