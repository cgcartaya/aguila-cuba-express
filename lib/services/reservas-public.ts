import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreBySlug } from "@/lib/services/stores";
import {
  sendReservationAdminAlertEmail,
  sendReservationReceivedEmail,
} from "@/lib/notifications/reservation-email";

import type { ReservationSlot, ReservationTable, ReservationStatus } from "@/lib/reservas/types";

/*
 * Todo este archivo es SOLO SERVIDOR (server components / route
 * handlers) — usa supabaseAdmin (service role) para poder calcular
 * disponibilidad sin exponer la tabla `reservations` (que tiene
 * nombre/teléfono del cliente) a un SELECT público anónimo. El
 * navegador nunca llama estas funciones directamente.
 */

function weekdayOf(dateStr: string) {
  // Mediodía evita que un corrimiento de zona horaria cambie el día.
  return new Date(`${dateStr}T12:00:00`).getDay();
}

function formatSlotTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateLabel(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Mismo criterio que app/api/cron/reminders/route.ts para construir
 *  links absolutos en emails. */
function getBaseUrl(store: { domain?: string | null; slug: string }) {
  if (store.domain) {
    return `https://${store.domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`;
  }
  return "https://perlamarketplace.com";
}

export type PublicReservationBoard = {
  store: {
    id: string;
    name: string;
    primary_color: string | null;
    secondary_color: string | null;
  };
  tables: ReservationTable[];
  slots: ReservationSlot[];
  /** Claves "tableId:slotId" ya ocupadas (pending o confirmed) para esa fecha. */
  occupied: string[];
  /** Si el negocio bloqueó esta fecha (feriado, evento privado...), el
   *  motivo que puso — o null si el día está abierto normalmente. */
  blockedReason: string | null;
};

export async function getPublicReservationBoard(
  slug: string,
  date: string
): Promise<PublicReservationBoard | null> {
  const store = await getStoreBySlug(slug);
  if (!store || !store.module_reservas_enabled) return null;

  const { data: blocked } = await supabaseAdmin
    .from("reservation_blocked_dates")
    .select("reason")
    .eq("store_id", store.id)
    .eq("blocked_date", date)
    .maybeSingle();

  if (blocked) {
    return {
      store: {
        id: store.id,
        name: store.name,
        primary_color: store.primary_color ?? null,
        secondary_color: store.secondary_color ?? null,
      },
      tables: [],
      slots: [],
      occupied: [],
      blockedReason: blocked.reason || "Cerrado para reservas ese día.",
    };
  }

  const [{ data: tables, error: tablesError }, { data: slots, error: slotsError }] =
    await Promise.all([
      supabaseAdmin
        .from("reservation_tables")
        .select("id, store_id, name, capacity, seat_type, zone, pos_row, pos_col, is_active, sort_order")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("reservation_slots")
        .select("id, store_id, label, start_time, duration_minutes, days_of_week, is_active, sort_order")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (tablesError) console.error("getPublicReservationBoard tables error:", tablesError.message);
  if (slotsError) console.error("getPublicReservationBoard slots error:", slotsError.message);

  const weekday = weekdayOf(date);
  const slotsForDay = ((slots ?? []) as ReservationSlot[]).filter((slot) =>
    slot.days_of_week.includes(weekday)
  );

  const { data: activeReservations, error: reservationsError } = await supabaseAdmin
    .from("reservations")
    .select("table_id, slot_id")
    .eq("store_id", store.id)
    .eq("reservation_date", date)
    .in("status", ["pending", "confirmed"]);

  if (reservationsError) {
    console.error("getPublicReservationBoard reservations error:", reservationsError.message);
  }

  const occupied = (activeReservations ?? []).map((r) => `${r.table_id}:${r.slot_id}`);

  return {
    store: {
      id: store.id,
      name: store.name,
      primary_color: store.primary_color ?? null,
      secondary_color: store.secondary_color ?? null,
    },
    tables: (tables ?? []) as ReservationTable[],
    slots: slotsForDay,
    occupied,
    blockedReason: null,
  };
}

export type CreateReservationInput = {
  storeSlug: string;
  tableId: string;
  slotId: string;
  reservationDate: string;
  partySize: number;
  customerName: string;
  customerLastName: string;
  customerEmail?: string;
  customerPhone: string;
  notes?: string;
};

export type CreateReservationResult =
  | { ok: true; id: string }
  | { ok: false; status: number; error: string };

/**
 * Crea la solicitud de reserva. La protección real contra choques
 * (dos personas reservando la misma mesa/fecha/franja al mismo
 * tiempo) es el índice único parcial `reservation_unique_active_slot`
 * en la base de datos — este chequeo previo es solo para dar un
 * mensaje claro; el índice es lo que garantiza que nunca queden dos
 * reservas activas en el mismo cupo aunque lleguen dos solicitudes
 * en el mismo instante.
 */
export async function createPublicReservation(
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  const store = await getStoreBySlug(input.storeSlug);
  if (!store || !store.module_reservas_enabled) {
    return { ok: false, status: 404, error: "Módulo de reservas no disponible." };
  }

  const { data: blocked } = await supabaseAdmin
    .from("reservation_blocked_dates")
    .select("id")
    .eq("store_id", store.id)
    .eq("blocked_date", input.reservationDate)
    .maybeSingle();

  if (blocked) {
    return { ok: false, status: 422, error: "Ese día no está disponible para reservas." };
  }

  const [{ data: table, error: tableError }, { data: slot, error: slotError }] = await Promise.all([
    supabaseAdmin
      .from("reservation_tables")
      .select("id, name, capacity, is_active")
      .eq("id", input.tableId)
      .eq("store_id", store.id)
      .maybeSingle(),
    supabaseAdmin
      .from("reservation_slots")
      .select("id, label, start_time")
      .eq("id", input.slotId)
      .eq("store_id", store.id)
      .maybeSingle(),
  ]);

  if (tableError || !table || !table.is_active) {
    return { ok: false, status: 404, error: "Esa mesa ya no está disponible." };
  }

  if (slotError || !slot) {
    return { ok: false, status: 404, error: "Esa franja horaria ya no está disponible." };
  }

  if (input.partySize > table.capacity) {
    return {
      ok: false,
      status: 422,
      error: `Esa mesa tiene capacidad para ${table.capacity} personas.`,
    };
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("reservations")
    .insert({
      store_id: store.id,
      table_id: input.tableId,
      slot_id: input.slotId,
      reservation_date: input.reservationDate,
      party_size: input.partySize,
      customer_name: input.customerName,
      customer_last_name: input.customerLastName,
      customer_email: input.customerEmail || null,
      customer_phone: input.customerPhone,
      notes: input.notes || null,
      status: "pending" as ReservationStatus,
    })
    .select("id, cancel_token")
    .single();

  if (insertError) {
    // 23505 = violación del índice único parcial → alguien más se
    // adelantó a reservar exactamente ese mismo cupo.
    if (insertError.code === "23505") {
      return { ok: false, status: 409, error: "Esa mesa acaba de reservarse. Elige otra." };
    }
    console.error("createPublicReservation insert error:", insertError.message);
    return { ok: false, status: 500, error: "No se pudo crear la reserva." };
  }

  const baseUrl = getBaseUrl({ domain: store.domain, slug: input.storeSlug });
  const dateLabel = formatDateLabel(input.reservationDate);
  const timeLabel = formatSlotTime(slot.start_time);

  // Ninguno de estos dos emails debe tumbar la reserva ya creada —
  // cada uno absorbe su propio error.
  if (input.customerEmail) {
    try {
      await sendReservationReceivedEmail({
        to: input.customerEmail,
        storeName: store.name,
        customerFirstName: input.customerName,
        tableName: table.name,
        partySize: input.partySize,
        dateLabel,
        timeLabel,
        cancelUrl: `${baseUrl}/reservas/cancelar/${inserted.cancel_token}`,
      });
    } catch (error) {
      console.error("createPublicReservation email cliente error:", error);
    }
  }

  try {
    const { data: settings } = await supabaseAdmin
      .from("store_settings")
      .select("order_notification_email")
      .eq("store_id", store.id)
      .maybeSingle();

    if (settings?.order_notification_email) {
      await sendReservationAdminAlertEmail({
        to: settings.order_notification_email,
        storeName: store.name,
        customerFullName: `${input.customerName} ${input.customerLastName}`.trim(),
        customerPhone: input.customerPhone,
        tableName: table.name,
        partySize: input.partySize,
        dateLabel,
        timeLabel,
        adminUrl: `${baseUrl}/admin/reservas/solicitudes`,
      });
    }
  } catch (error) {
    console.error("createPublicReservation email negocio error:", error);
  }

  return { ok: true, id: inserted.id };
}

/* =========================================================
   CANCELACIÓN POR TOKEN — el cliente cancela su propia reserva
   desde el link del email, sin tener que llamar al negocio. El
   token es un UUID no adivinable, así que sirve como credencial.
========================================================= */

export type CancelTokenReservation = {
  id: string;
  status: ReservationStatus;
  reservation_date: string;
  party_size: number;
  store_name: string;
  table_name: string;
  slot_label: string;
  start_time: string;
};

export async function getReservationByCancelToken(
  token: string
): Promise<CancelTokenReservation | null> {
  const { data, error } = await supabaseAdmin
    .from("reservations")
    .select(
      `
      id,
      status,
      reservation_date,
      party_size,
      stores ( name ),
      reservation_tables ( name ),
      reservation_slots ( label, start_time )
    `
    )
    .eq("cancel_token", token)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    status: ReservationStatus;
    reservation_date: string;
    party_size: number;
    stores: { name: string } | null;
    reservation_tables: { name: string } | null;
    reservation_slots: { label: string; start_time: string } | null;
  };

  return {
    id: row.id,
    status: row.status,
    reservation_date: row.reservation_date,
    party_size: row.party_size,
    store_name: row.stores?.name || "",
    table_name: row.reservation_tables?.name || "Mesa",
    slot_label: row.reservation_slots?.label || "",
    start_time: row.reservation_slots?.start_time || "00:00",
  };
}

export async function cancelReservationByToken(
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("reservations")
    .select("id, status")
    .eq("cancel_token", token)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: "No se encontró la reserva." };
  }

  if (existing.status === "cancelled" || existing.status === "rejected") {
    return { ok: false, error: "Esta reserva ya no está activa." };
  }

  const { error } = await supabaseAdmin
    .from("reservations")
    .update({ status: "cancelled" as ReservationStatus })
    .eq("id", existing.id);

  if (error) {
    console.error("cancelReservationByToken error:", error.message);
    return { ok: false, error: "No se pudo cancelar la reserva." };
  }

  return { ok: true };
}
