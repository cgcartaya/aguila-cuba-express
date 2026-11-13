export type NewOrderEmailParams = {
  toEmails: string[];
  storeName: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryLabel: string;
  destination: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  total: number;
  items: {
    product_name: string;
    item_type: "product" | "combo";
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
};

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function formatAmount(amount: number) {
  if (!Number.isFinite(amount)) throw new Error("Importe inválido en el correo de orden");
  return usd.format(amount);
}

function detailRow(label: string, value: string) {
  if (!value) return "";
  return `<tr><th scope="row" style="text-align:left;padding:5px 8px 5px 0;">${label}</th><td style="padding:5px 0;overflow-wrap:anywhere;">${escapeHtml(value)}</td></tr>`;
}

export function renderNewOrderEmail(params: Omit<NewOrderEmailParams, "toEmails">) {
  const units = params.items.reduce((sum, item) => sum + item.quantity, 0);
  const cell = "padding:8px 4px;border-bottom:1px solid #e2e8f0;";
  const numericCell = `${cell}text-align:right;`;
  const items = params.items.map((item) => `
    <tr>
      <td style="${cell}overflow-wrap:anywhere;word-wrap:break-word;">${escapeHtml(item.product_name)}${item.item_type === "combo" ? '<br><span style="color:#475569;">Combo</span>' : ""}</td>
      <td style="${numericCell}">${escapeHtml(String(item.quantity))}</td>
      <td style="${numericCell}">${formatAmount(item.unit_price)}</td>
      <td style="${numericCell}">${formatAmount(item.subtotal)}</td>
    </tr>`).join("");

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background-color:#f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;">
    <tr><td align="center" style="padding:12px 8px;">
      <!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;color:#0f172a;font:14px Arial,sans-serif;">
        <tr><td bgcolor="#0B2545" style="padding:22px 16px;color:#ffffff;">
          <strong style="letter-spacing:1px;">PERLAMARKETPLACE</strong>
          <h1 style="font-size:24px;margin:10px 0;">¡Nueva orden recibida!</h1>
          <div>Tienda: ${escapeHtml(params.storeName)}</div>
          <div>Orden: #${escapeHtml(params.orderNumber)}</div>
        </td></tr>
        <tr><td style="padding:16px;">
          <h2 style="font-size:18px;margin:0 0 8px;">Información del comprador</h2>
          <table width="100%" cellspacing="0" cellpadding="0">
            ${detailRow("Nombre", params.customerName)}
            ${detailRow("Teléfono", params.customerPhone)}
            ${detailRow("Correo electrónico", params.customerEmail ?? "")}
            ${detailRow("Número de orden", `#${params.orderNumber}`)}
            ${detailRow("Tipo de entrega", params.deliveryLabel)}
            ${detailRow("Destino", params.destination)}
          </table>
          <h2 style="font-size:18px;margin:22px 0 8px;">Detalle de productos</h2>
          <p style="margin:0 0 10px;">Productos diferentes: ${params.items.length} · Unidades totales: ${units}</p>
          <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;font-size:13px;">
            <thead><tr bgcolor="#f1f5f9">
              <th scope="col" width="37%" style="${cell}text-align:left;">Producto</th>
              <th scope="col" width="19%" style="${numericCell}">Cantidad</th>
              <th scope="col" width="22%" style="${numericCell}">Precio unitario</th>
              <th scope="col" width="22%" style="${numericCell}">Importe</th>
            </tr></thead>
            <tbody>${items}</tbody>
          </table>
          <h2 style="font-size:18px;margin:22px 0 8px;">Resumen financiero</h2>
          <table width="100%" cellspacing="0" cellpadding="0">
            ${detailRow("Subtotal de productos", formatAmount(params.subtotal))}
            ${detailRow("Envío", formatAmount(params.deliveryFee))}
            ${params.discountAmount > 0 ? detailRow("Descuento", formatAmount(-params.discountAmount)) : ""}
            <tr bgcolor="#e8eff8">
              <th scope="row" style="text-align:left;padding:10px 8px;">TOTAL DE LA ORDEN</th>
              <td style="padding:10px 8px;font-weight:bold;">${formatAmount(params.total)}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:14px 16px;background-color:#f8fafc;color:#475569;font-size:12px;line-height:18px;">
          Esta es una notificación automática de PerlaMarketplace. Para gestionar esta orden, accede al panel administrativo de tu tienda.
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendNewOrderEmail(params: NewOrderEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail || params.toEmails.length === 0) return;

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
        html: renderNewOrderEmail(params),
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
