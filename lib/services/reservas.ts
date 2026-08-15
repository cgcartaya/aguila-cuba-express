import { supabase } from "@/lib/supabase";
import { getStoreBySlug } from "@/lib/services/stores";

import type {
  BlockedDate,
  Reservation,
  ReservationSlot,
  ReservationSlotFormData,
  ReservationStatus,
  ReservationTable,
  ReservationTableFormData,
} from "@/lib/reservas/types";

/* =========================================================
   HELPER — igual que isMenuModuleEnabled: falla cerrado (false)
   ante cualquier error, para nunca mostrar un link/página rota.
========================================================= */

export async function isReservasModuleEnabled(slug: string): Promise<boolean> {
  const store = await getStoreBySlug(slug);
  return store?.module_reservas_enabled === true;
}

/* =========================================================
   ADMIN — MESAS
========================================================= */

export async function getReservationTablesForAdmin(storeId: string) {
  return supabase
    .from("reservation_tables")
    .select("id, store_id, name, capacity, seat_type, zone, pos_row, pos_col, is_active, sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
}

export async function saveReservationTable(storeId: string, form: ReservationTableFormData) {
  const payload = {
    store_id: storeId,
    name: form.name,
    capacity: form.capacity,
    seat_type: form.seat_type,
    zone: form.zone.trim() || null,
    pos_row: form.pos_row,
    pos_col: form.pos_col,
    is_active: form.is_active,
    sort_order: form.sort_order,
  };

  if (form.id) {
    return supabase
      .from("reservation_tables")
      .update(payload)
      .eq("id", form.id)
      .select()
      .single();
  }

  return supabase.from("reservation_tables").insert(payload).select().single();
}

export async function deleteReservationTable(id: string) {
  // Borra en cascada las reservas de esa mesa (FK on delete cascade).
  return supabase.from("reservation_tables").delete().eq("id", id);
}

/* =========================================================
   ADMIN — FRANJAS HORARIAS
========================================================= */

export async function getReservationSlotsForAdmin(storeId: string) {
  return supabase
    .from("reservation_slots")
    .select("id, store_id, label, start_time, duration_minutes, days_of_week, is_active, sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });
}

export async function saveReservationSlot(storeId: string, form: ReservationSlotFormData) {
  const payload = {
    store_id: storeId,
    label: form.label,
    // El input <input type="time"> entrega "HH:MM" — Postgres time acepta eso.
    start_time: form.start_time,
    duration_minutes: form.duration_minutes,
    days_of_week: form.days_of_week,
    is_active: form.is_active,
    sort_order: form.sort_order,
  };

  if (form.id) {
    return supabase
      .from("reservation_slots")
      .update(payload)
      .eq("id", form.id)
      .select()
      .single();
  }

  return supabase.from("reservation_slots").insert(payload).select().single();
}

export async function deleteReservationSlot(id: string) {
  return supabase.from("reservation_slots").delete().eq("id", id);
}

/* =========================================================
   ADMIN — SOLICITUDES DE RESERVA
   El negocio ve todo (nombre/teléfono del cliente incluidos) y
   confirma/rechaza. Por defecto trae las de hoy en adelante.
========================================================= */

const RESERVATION_ADMIN_SELECT = `
  id,
  store_id,
  table_id,
  slot_id,
  reservation_date,
  party_size,
  customer_name,
  customer_last_name,
  customer_email,
  customer_phone,
  notes,
  status,
  created_at,
  confirmed_at,
  reservation_tables ( name, capacity ),
  reservation_slots ( label, start_time )
`;

export async function getReservationsForAdmin(
  storeId: string,
  opts?: { date?: string; status?: ReservationStatus }
) {
  let query = supabase
    .from("reservations")
    .select(RESERVATION_ADMIN_SELECT)
    .eq("store_id", storeId);

  if (opts?.date) {
    query = query.eq("reservation_date", opts.date);
  } else {
    // Sin fecha explícita: solo hoy en adelante, para no ahogar la
    // lista con reservas pasadas.
    const today = new Date().toISOString().slice(0, 10);
    query = query.gte("reservation_date", today);
  }

  if (opts?.status) {
    query = query.eq("status", opts.status);
  }

  return query
    .order("reservation_date", { ascending: true })
    .order("created_at", { ascending: true }) as unknown as Promise<{
    data: Reservation[] | null;
    error: { message: string } | null;
  }>;
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  return supabase
    .from("reservations")
    .update({
      status,
      confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select()
    .single();
}

/* =========================================================
   ADMIN — CONTEO DE PENDIENTES (badge del menú lateral)
========================================================= */

export async function getPendingReservationsCount(storeId: string) {
  return supabase
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "pending");
}

/* =========================================================
   ADMIN — FECHAS BLOQUEADAS (feriados, eventos privados...)
========================================================= */

export async function getBlockedDatesForAdmin(storeId: string) {
  return supabase
    .from("reservation_blocked_dates")
    .select("id, store_id, blocked_date, reason, created_at")
    .eq("store_id", storeId)
    .order("blocked_date", { ascending: true }) as unknown as Promise<{
    data: BlockedDate[] | null;
    error: { message: string; code?: string } | null;
  }>;
}

export async function addBlockedDate(storeId: string, blockedDate: string, reason: string) {
  return supabase
    .from("reservation_blocked_dates")
    .insert({ store_id: storeId, blocked_date: blockedDate, reason: reason.trim() || null })
    .select()
    .single();
}

export async function deleteBlockedDate(id: string) {
  return supabase.from("reservation_blocked_dates").delete().eq("id", id);
}

/* =========================================================
   ADMIN — VISTA SEMANAL (calendario de 7 días)
   Trae todas las reservas activas (pending/confirmed) de un rango
   de fechas para armar la cuadrícula día × franja de un vistazo.
========================================================= */

export async function getReservationsForWeek(storeId: string, startDate: string, endDate: string) {
  return supabase
    .from("reservations")
    .select(
      `
      id,
      reservation_date,
      status,
      party_size,
      slot_id,
      reservation_tables ( name ),
      reservation_slots ( label, start_time )
    `
    )
    .eq("store_id", storeId)
    .gte("reservation_date", startDate)
    .lte("reservation_date", endDate)
    .in("status", ["pending", "confirmed"])
    .order("reservation_date", { ascending: true }) as unknown as Promise<{
    data:
      | (Pick<Reservation, "id" | "reservation_date" | "status" | "party_size" | "slot_id"> & {
          reservation_tables: { name: string } | null;
          reservation_slots: { label: string; start_time: string } | null;
        })[]
      | null;
    error: { message: string } | null;
  }>;
}

export type { ReservationTable, ReservationSlot };
