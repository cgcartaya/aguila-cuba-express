import { supabaseAdmin } from "@/lib/supabase-admin";

type PickupNotification = {
  storeId: string;
  storeName: string;
  requestCode: string;
  customerName: string;
  phone: string;
  address: string;
  dates: string[];
  packageCount: number;
  packageType: string;
  estimatedWeight: number | null;
  needsBox: boolean;
  needsPackingHelp: boolean;
  notes: string;
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Called only after the request and its preferred dates have been saved.
// Notification failures must never undo a customer's pickup request.
export async function sendPickupNotification(pickup: PickupNotification) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !fromEmail) {
      console.warn("Pickup notification skipped: Resend is not configured.");
      return;
    }

    const { data: settings, error } = await supabaseAdmin
      .from("store_settings")
      .select("order_notification_email")
      .eq("store_id", pickup.storeId)
      .maybeSingle();
    if (error) throw error;

    const recipient = String(settings?.order_notification_email || "").trim();
    if (!recipient) {
      console.warn("Pickup notification skipped: no notification email for store", pickup.storeId);
      return;
    }

    const rows = [
      ["Solicitud", pickup.requestCode],
      ["Cliente", pickup.customerName],
      ["Teléfono", pickup.phone],
      ["Dirección", pickup.address],
      ["Fechas preferidas", pickup.dates.map((date) => date.split("-").reverse().join("/")).join(", ")],
      ["Paquetes", String(pickup.packageCount)],
      ["Tipo", pickup.packageType || "Sin especificar"],
      ["Peso estimado", pickup.estimatedWeight == null ? "Sin especificar" : `${pickup.estimatedWeight} lb`],
      ["Necesita caja", pickup.needsBox ? "Sí" : "No"],
      ["Ayuda de empaque", pickup.needsPackingHelp ? "Sí" : "No"],
      ["Notas", pickup.notes || "Sin notas"],
    ];
    // Use a fixed trusted platform URL rather than an untrusted request Host.
    const adminUrl = "https://perlamarketplace.com/admin/pickups";
    const text = [`Nueva solicitud de recogida — ${pickup.storeName}`, ...rows.map(([label, value]) => `${label}: ${value}`), "Las fechas son preferencias del cliente, pendientes de confirmación.", `Ver en administración: ${adminUrl}`].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#071b3d"><h2>Nueva solicitud de recogida</h2><p>${escapeHtml(pickup.storeName)}</p><table style="width:100%;border-collapse:collapse">${rows.map(([label, value]) => `<tr><th style="text-align:left;vertical-align:top;padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(label)}</th><td style="padding:8px;border-bottom:1px solid #e2e8f0;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`).join("")}</table><p>Las fechas son preferencias del cliente, pendientes de confirmación.</p><p><a href="${adminUrl}" style="display:inline-block;padding:14px 20px;background:#1757f5;color:white;border-radius:12px;text-decoration:none">Ver solicitudes de recogida</a></p></div>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `pickup-request/${pickup.storeId}/${pickup.requestCode}`,
      },
      body: JSON.stringify({ from: fromEmail, to: [recipient], subject: `Nueva recogida ${pickup.requestCode} — ${pickup.storeName}`, html, text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      // Do not log the payload or customer details.
      console.error("Pickup notification rejected by Resend:", response.status);
    }
  } catch (error) {
    console.error("Pickup notification failed (request remains saved):", error instanceof Error ? error.message : "Notification error");
  }
}
