/* =========================================================
   EMAILS — MÓDULO DE RESERVAS

   Mismo patrón que lib/notifications/reminder-email.ts: usa
   Resend, ninguna función lanza (el caller debe envolver en
   try/catch y absorber el error — un email caído nunca debe
   tumbar la creación/actualización de una reserva), y si
   RESEND_API_KEY/RESEND_FROM_EMAIL no están configurados
   simplemente no manda nada.
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
      console.error("Error enviando email de reserva (Resend):", response.status, errorBody);
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    console.error("Error de red enviando email de reserva:", error);
    return { sent: false };
  }
}

/* =========================================================
   1) SOLICITUD RECIBIDA — al cliente, justo al crear la reserva.
========================================================= */

type ReservationReceivedEmailParams = {
  to: string;
  storeName: string;
  customerFirstName: string;
  tableName: string;
  partySize: number;
  dateLabel: string; // ya formateado, ej. "sábado 20 de agosto"
  timeLabel: string; // ej. "7:00 PM"
  cancelUrl: string;
};

export async function sendReservationReceivedEmail(params: ReservationReceivedEmailParams) {
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #061b3a;">¡Solicitud recibida!</h2>
      <p style="font-size: 15px; color: #334155;">
        Hola ${escapeHtml(params.customerFirstName)}, recibimos tu solicitud de reserva en
        <strong>${escapeHtml(params.storeName)}</strong>. En cuanto el negocio la confirme, te
        avisarán por teléfono/WhatsApp.
      </p>
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse; margin-top: 12px;">
        <tr><td style="padding: 4px 0;">Fecha</td><td style="text-align: right;"><strong>${escapeHtml(params.dateLabel)}</strong></td></tr>
        <tr><td style="padding: 4px 0;">Hora</td><td style="text-align: right;"><strong>${escapeHtml(params.timeLabel)}</strong></td></tr>
        <tr><td style="padding: 4px 0;">Mesa</td><td style="text-align: right;">${escapeHtml(params.tableName)}</td></tr>
        <tr><td style="padding: 4px 0;">Personas</td><td style="text-align: right;">${params.partySize}</td></tr>
      </table>
      <p style="margin-top: 20px;">
        <a href="${params.cancelUrl}" style="display: inline-block; padding: 10px 18px; border-radius: 999px; background: #f1f5f9; color: #334155; text-decoration: none; font-size: 13px; font-weight: 700;">
          Cancelar esta reserva
        </a>
      </p>
      <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
        Esta es una solicitud, todavía no una reserva confirmada. Si el negocio no puede
        atenderte en ese horario te lo hará saber.
      </p>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Solicitud de reserva recibida — ${params.storeName}`,
    html,
  });
}

/* =========================================================
   2) AVISO AL NEGOCIO — cada vez que entra una solicitud nueva.
========================================================= */

type ReservationAdminAlertEmailParams = {
  to: string;
  storeName: string;
  customerFullName: string;
  customerPhone: string;
  tableName: string;
  partySize: number;
  dateLabel: string;
  timeLabel: string;
  adminUrl: string;
};

export async function sendReservationAdminAlertEmail(params: ReservationAdminAlertEmailParams) {
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #061b3a;">Nueva solicitud de reserva</h2>
      <table style="width: 100%; font-size: 14px; color: #334155; border-collapse: collapse;">
        <tr><td style="padding: 4px 0;">Cliente</td><td style="text-align: right;"><strong>${escapeHtml(params.customerFullName)}</strong></td></tr>
        <tr><td style="padding: 4px 0;">Teléfono</td><td style="text-align: right;">${escapeHtml(params.customerPhone)}</td></tr>
        <tr><td style="padding: 4px 0;">Fecha</td><td style="text-align: right;"><strong>${escapeHtml(params.dateLabel)}</strong></td></tr>
        <tr><td style="padding: 4px 0;">Hora</td><td style="text-align: right;">${escapeHtml(params.timeLabel)}</td></tr>
        <tr><td style="padding: 4px 0;">Mesa</td><td style="text-align: right;">${escapeHtml(params.tableName)}</td></tr>
        <tr><td style="padding: 4px 0;">Personas</td><td style="text-align: right;">${params.partySize}</td></tr>
      </table>
      <p style="margin-top: 20px;">
        <a href="${params.adminUrl}" style="display: inline-block; padding: 10px 18px; border-radius: 999px; background: #061b3a; color: white; text-decoration: none; font-size: 13px; font-weight: 700;">
          Ver y confirmar
        </a>
      </p>
      <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">
        Queda en estado "pendiente" hasta que la confirmes o la rechaces desde el panel.
      </p>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Nueva reserva pendiente — ${params.storeName}`,
    html,
  });
}

/* =========================================================
   3) RECORDATORIO — el día de la reserva confirmada.
========================================================= */

type ReservationReminderEmailParams = {
  to: string;
  storeName: string;
  customerFirstName: string;
  tableName: string;
  partySize: number;
  timeLabel: string;
  cancelUrl: string;
};

export async function sendReservationReminderEmail(params: ReservationReminderEmailParams) {
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #061b3a;">Tu reserva es hoy</h2>
      <p style="font-size: 15px; color: #334155;">
        Hola ${escapeHtml(params.customerFirstName)}, te recordamos tu reserva hoy en
        <strong>${escapeHtml(params.storeName)}</strong> a las <strong>${escapeHtml(params.timeLabel)}</strong>
        (${params.tableName}, ${params.partySize} personas). ¡Te esperamos!
      </p>
      <p style="margin-top: 16px;">
        <a href="${params.cancelUrl}" style="display: inline-block; padding: 10px 18px; border-radius: 999px; background: #f1f5f9; color: #334155; text-decoration: none; font-size: 13px; font-weight: 700;">
          ¿No podrás venir? Cancela aquí
        </a>
      </p>
    </div>
  `;

  return sendEmail({
    to: params.to,
    subject: `Recordatorio: tu reserva hoy en ${params.storeName}`,
    html,
  });
}
