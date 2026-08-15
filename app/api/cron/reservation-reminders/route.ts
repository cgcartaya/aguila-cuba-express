// Guardar en: app/api/cron/reservation-reminders/route.ts
//
// RECORDATORIO AUTOMÁTICO DE RESERVAS — mismo patrón que
// app/api/cron/reminders/route.ts: pensado para correr cada 30-60
// min vía Vercel Cron, protegido con CRON_SECRET, y absorbe cada
// envío en su propio try/catch para que un error con un cliente no
// tumbe el resto de la corrida. Solo manda email (no WhatsApp
// automático — requeriría la API de WhatsApp Business de Meta, que
// no está integrada todavía); si la reserva no tiene email, se
// omite silenciosamente.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendReservationReminderEmail } from "@/lib/notifications/reservation-email";

export const maxDuration = 60;

// Ventana antes de la franja en la que se considera "hora de avisar".
// Con un cron cada 30-60 min, una ventana de 3h asegura que ninguna
// reserva se quede sin su recordatorio por mal timing.
const REMINDER_HOURS_BEFORE = 3;

function getBaseUrl(domain?: string | null) {
  if (domain) {
    return `https://${domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`;
  }
  return "https://perlamarketplace.com";
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const today = todayISO();
  const now = new Date();

  const { data: reservations, error } = await supabaseAdmin
    .from("reservations")
    .select(
      `
      id,
      party_size,
      customer_name,
      customer_email,
      cancel_token,
      stores ( name, domain ),
      reservation_tables ( name ),
      reservation_slots ( start_time )
    `
    )
    .eq("status", "confirmed")
    .eq("reservation_date", today)
    .is("reminder_sent_at", null)
    .not("customer_email", "is", null);

  if (error) {
    console.error("Cron reservation-reminders: error consultando reservas:", error.message);
    return NextResponse.json({ error: "Error consultando reservas." }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const row of reservations || []) {
    try {
      const r = row as unknown as {
        id: string;
        party_size: number;
        customer_name: string;
        customer_email: string;
        cancel_token: string;
        stores: { name: string; domain: string | null } | null;
        reservation_tables: { name: string } | null;
        reservation_slots: { start_time: string } | null;
      };

      const startTime = r.reservation_slots?.start_time;
      if (!startTime) {
        skipped++;
        continue;
      }

      const [h, m] = startTime.split(":").map(Number);
      const slotDateTime = new Date(today);
      slotDateTime.setHours(h, m, 0, 0);

      const hoursUntilSlot = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Fuera de la ventana de aviso todavía (falta mucho) o ya pasó
      // la hora de la reserva — se deja para la próxima corrida o se
      // omite si ya pasó.
      if (hoursUntilSlot > REMINDER_HOURS_BEFORE || hoursUntilSlot < 0) {
        skipped++;
        continue;
      }

      const baseUrl = getBaseUrl(r.stores?.domain);

      await sendReservationReminderEmail({
        to: r.customer_email,
        storeName: r.stores?.name || "",
        customerFirstName: r.customer_name,
        tableName: r.reservation_tables?.name || "tu mesa",
        partySize: r.party_size,
        timeLabel: formatTime(startTime),
        cancelUrl: `${baseUrl}/reservas/cancelar/${r.cancel_token}`,
      });

      await supabaseAdmin
        .from("reservations")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("id", r.id);

      sent++;
    } catch (rowError) {
      console.error("Cron reservation-reminders: error en una reserva:", rowError);
    }
  }

  return NextResponse.json({ sent, skipped, total: (reservations || []).length });
}
