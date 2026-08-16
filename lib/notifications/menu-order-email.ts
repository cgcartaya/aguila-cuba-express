/* =========================================================
   EMAILS — ÓRDENES DEL MENÚ
   Mismo patrón que lib/notifications/reservation-email.ts.
========================================================= */

import type { MenuOrderType } from "@/lib/menu/types";

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
      console.error("Error enviando email de orden (Resend):", response.status, errorBody);
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    console.error("Error de red enviando email de orden:", error);
    return { sent: false };
  }
}

const ORDER_TYPE_LABEL: Record<MenuOrderType, string> = {
  dine_in: "En el restaurante",
  takeaway: "Para llevar",
  delivery: "Domicilio",
};

type OrderLine = { name: string; quantity: number; lineTotal: number };

function renderLinesTable(lines: OrderLine[]) {
  return lines
    .map(
      (l) => `
      <tr>
        <td style="padding:4px 0;">${l.quantity}x ${escapeHtml(l.name)}</td>
        <td style="padding:4px 0; text-align:right;">$${l.lineTotal.toFixed(2)}</td>
      </tr>`
    )
    .join("");
}

/* =========================================================
   1) ORDEN RECIBIDA — al cliente.
========================================================= */

type OrderReceivedEmailParams = {
  to: string;
  storeName: string;
  customerFirstName: string;
  orderType: MenuOrderType;
  tableNumber?: string | null;
  deliveryAddress?: string | null;
  lines: OrderLine[];
  total: number;
};

export async function sendMenuOrderReceivedEmail(params: OrderReceivedEmailParams) {
  const typeLine =
    params.orderType === "dine_in"
      ? `En el restaurante${params.tableNumber ? ` · Mesa ${escapeHtml(params.tableNumber)}` : ""}`
      : params.orderType === "delivery"
      ? `Domicilio${params.deliveryAddress ? ` · ${escapeHtml(params.deliveryAddress)}` : ""}`
      : "Para llevar";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #061b3a;">¡Pedido recibido!</h2>
      <p style="font-size: 15px; color: #334155;">
        Hola ${escapeHtml(params.customerFirstName)}, <strong>${escapeHtml(params.storeName)}</strong> recibió tu pedido.
      </p>
      <p style="font-size: 13px; color: #64748b; font-weight: 700;">${typeLine}</p>
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse; margin-top: 10px;">
        ${renderLinesTable(params.lines)}
        <tr><td style="padding-top:8px; font-weight:700;">Total</td><td style="padding-top:8px; text-align:right; font-weight:700;">$${params.total.toFixed(2)}</td></tr>
      </table>
      <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
        ${escapeHtml(params.storeName)} confirmará tu pedido en breve.
      </p>
    </div>
  `;

  return sendEmail({ to: params.to, subject: `Pedido recibido — ${params.storeName}`, html });
}

/* =========================================================
   2) AVISO AL NEGOCIO — cada vez que entra un pedido nuevo.
========================================================= */

type OrderAdminAlertEmailParams = {
  to: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  orderType: MenuOrderType;
  tableNumber?: string | null;
  deliveryAddress?: string | null;
  lines: OrderLine[];
  total: number;
  adminUrl: string;
};

export async function sendMenuOrderAdminAlertEmail(params: OrderAdminAlertEmailParams) {
  const typeLine =
    params.orderType === "dine_in"
      ? `En el restaurante${params.tableNumber ? ` · Mesa ${escapeHtml(params.tableNumber)}` : ""}`
      : params.orderType === "delivery"
      ? `Domicilio · ${escapeHtml(params.deliveryAddress || "")}`
      : "Para llevar";

  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #061b3a;">Nuevo pedido — ${ORDER_TYPE_LABEL[params.orderType]}</h2>
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse;">
        <tr><td style="padding: 4px 0;">Cliente</td><td style="text-align: right;"><strong>${escapeHtml(params.customerName)}</strong></td></tr>
        <tr><td style="padding: 4px 0;">Teléfono</td><td style="text-align: right;">${escapeHtml(params.customerPhone)}</td></tr>
        <tr><td style="padding: 4px 0;">Tipo</td><td style="text-align: right;">${typeLine}</td></tr>
      </table>
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse; margin-top: 10px;">
        ${renderLinesTable(params.lines)}
        <tr><td style="padding-top:8px; font-weight:700;">Total</td><td style="padding-top:8px; text-align:right; font-weight:700;">$${params.total.toFixed(2)}</td></tr>
      </table>
      <p style="margin-top: 20px;">
        <a href="${params.adminUrl}" style="display: inline-block; padding: 10px 18px; border-radius: 999px; background: #061b3a; color: white; text-decoration: none; font-size: 13px; font-weight: 700;">
          Ver pedido
        </a>
      </p>
    </div>
  `;

  return sendEmail({ to: params.to, subject: `Nuevo pedido — ${params.storeName}`, html });
}
