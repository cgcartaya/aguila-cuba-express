import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreBySlug } from "@/lib/services/stores";

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
};

export async function getPublicReservationBoard(
  slug: string,
  date: string
): Promise<PublicReservationBoard | null> {
  const store = await getStoreBySlug(slug);
  if (!store || !store.module_reservas_enabled) return null;

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
  };
}

export type CreateReservationInput = {
  storeSlug: string;
  tableId: string;
  slotId: string;
  reservationDate: string;
  partySize: number;
  customerName: string;
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

  const { data: table, error: tableError } = await supabaseAdmin
    .from("reservation_tables")
    .select("id, capacity, is_active")
    .eq("id", input.tableId)
    .eq("store_id", store.id)
    .maybeSingle();

  if (tableError || !table || !table.is_active) {
    return { ok: false, status: 404, error: "Esa mesa ya no está disponible." };
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
      customer_phone: input.customerPhone,
      notes: input.notes || null,
      status: "pending" as ReservationStatus,
    })
    .select("id")
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

  return { ok: true, id: inserted.id };
}
