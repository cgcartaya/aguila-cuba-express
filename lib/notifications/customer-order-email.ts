/* =========================================================
   EMAIL DE CONFIRMACIÓN — COMPRA DEL CLIENTE

   Se llama desde create-order/route.ts justo después de crear la
   orden con éxito, dentro del mismo after() que ya se usaba para
   avisarle a la tienda. Nunca debe tumbar la creación de la orden
   si el email falla.

   Solo se manda si el cliente dejó un email en el checkout
   (form.email). Si no dejó email, o si RESEND_API_KEY /
   RESEND_FROM_EMAIL no están configuradas, no se manda nada
   (silencioso, no es un error).
========================================================= */

type OrderItemLine = {
  product_name: string;
  quantity: number;
  subtotal: number;
};

type CustomerOrderEmailParams = {
  toEmail: string;
  storeName: string;
  orderNumber: string;
  orderUrl: string;
  customerName: string;
  items: OrderItemLine[];
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
};

export async function sendCustomerOrderConfirmationEmail(
  params: CustomerOrderEmailParams
) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    // No configurado todavía — no es un error, solo no se manda nada.
    return;
  }

  if (!params.toEmail) return;

  const itemsRows = params.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 6px 0; color: #334155;">${escapeHtml(item.product_name)} × ${item.quantity}</td>
          <td style="padding: 6px 0; text-align: right; color: #334155;">$${item.subtotal.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #061b3a;">¡Gracias por tu compra, ${escapeHtml(params.customerName)}!</h2>
      <p style="font-size: 15px; color: #334155;">
        Tu pedido en <strong>${escapeHtml(params.storeName)}</strong> fue recibido correctamente.
      </p>
      <p style="font-size: 15px; color: #334155;">
        Número de orden: <strong>#${escapeHtml(params.orderNumber)}</strong>
      </p>

      <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-top: 12px;">
        ${itemsRows}
        <tr><td style="padding: 8px 0; border-top: 1px solid #e2e8f0; color: #334155;">Productos</td><td style="text-align: right; padding: 8px 0; border-top: 1px solid #e2e8f0; color: #334155;">$${params.subtotal.toFixed(2)}</td></tr>
        <tr><td style="padding: 4px 0; color: #334155;">Envío</td><td style="text-align: right; color: #334155;">$${params.deliveryFee.toFixed(2)}</td></tr>
        ${
          params.discountAmount > 0
            ? `<tr><td style="padding: 4px 0; color: #16a34a;">Descuento</td><td style="text-align: right; color: #16a34a;">-$${params.discountAmount.toFixed(2)}</td></tr>`
            : ""
        }
        <tr><td style="padding: 8px 0; font-size: 16px; color: #061b3a;"><strong>Total</strong></td><td style="text-align: right; padding: 8px 0; font-size: 16px; color: #061b3a;"><strong>$${params.total.toFixed(2)}</strong></td></tr>
      </table>

      <div style="margin-top: 24px; text-align: center;">
        <a href="${params.orderUrl}" style="display: inline-block; background: #061b3a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 14px;">
          Ver mi pedido
        </a>
      </div>

      <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">
        Desde esa página también puedes compartir tu pedido por WhatsApp.
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
        to: [params.toEmail],
        subject: `Confirmación de tu pedido #${params.orderNumber} — ${params.storeName}`,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        "Error enviando email de confirmación al cliente (Resend):",
        response.status,
        errorBody
      );
    }
  } catch (error) {
    console.error(
      "Error de red enviando email de confirmación al cliente:",
      error
    );
  }
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
