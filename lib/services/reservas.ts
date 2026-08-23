import { supabase } from "@/lib/supabase";
import { getStoreBySlug } from "@/lib/services/stores";

import type {
  BlockedDate,
  Reservation,
  ReservationSlot,
  ReservationSpace,
  ReservationSpaceFormData,
  ReservationSpaceElement,
  ReservationSpaceElementFormData,
  ReservationSlotFormData,
  ReservationStatus,
  ReservationTable,
  ReservationTableFormData,
} from "@/lib/reservas/types";

export async function isReservasModuleEnabled(slug: string): Promise<boolean> {
  const store = await getStoreBySlug(slug);
  return store?.module_reservas_enabled === true;
}

export async function getReservationSpacesForAdmin(storeId: string) {
  return supabase
    .from("reservation_spaces")
    .select("id, store_id, name, description, space_type, floor_label, image_url, canvas_shape, is_active, sort_order, created_at, updated_at")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true }) as unknown as Promise<{
      data: ReservationSpace[] | null;
      error: { message: string } | null;
    }>;
}

export async function saveReservationSpace(storeId: string, form: ReservationSpaceFormData) {
  const payload = {
    store_id: storeId,
    name: form.name.trim(),
    description: form.description.trim() || null,
    space_type: form.space_type,
    floor_label: form.floor_label.trim() || null,
    image_url: form.image_url.trim() || null,
    canvas_shape: form.canvas_shape,
    is_active: form.is_active,
    sort_order: form.sort_order,
    updated_at: new Date().toISOString(),
  };
  if (form.id) {
    return supabase.from("reservation_spaces").update(payload).eq("id", form.id).select().single();
  }
  return supabase.from("reservation_spaces").insert(payload).select().single();
}

export async function deleteReservationSpace(id: string) {
  return supabase.from("reservation_spaces").delete().eq("id", id);
}

export async function getReservationTablesForAdmin(storeId: string) {
  return supabase
    .from("reservation_tables")
    .select("id, store_id, name, capacity, seat_type, zone, space_id, pos_row, pos_col, pos_x, pos_y, rotation, table_shape, is_active, is_locked, sort_order")
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
    space_id: form.space_id || null,
    pos_row: form.pos_row,
    pos_col: form.pos_col,
    pos_x: form.pos_x,
    pos_y: form.pos_y,
    rotation: form.rotation,
    table_shape: form.table_shape,
    is_active: form.is_active,
    is_locked: form.is_locked ?? false,
    sort_order: form.sort_order,
  };
  if (form.id) {
    return supabase.from("reservation_tables").update(payload).eq("id", form.id).select().single();
  }
  return supabase.from("reservation_tables").insert(payload).select().single();
}

export async function deleteReservationTable(id: string) {
  return supabase.from("reservation_tables").delete().eq("id", id);
}

export async function getReservationSpaceElementsForAdmin(storeId: string, spaceId?: string) {
  let query = supabase
    .from("reservation_space_elements")
    .select("id, store_id, space_id, element_type, label, pos_x, pos_y, width, height, rotation, is_locked, sort_order")
    .eq("store_id", storeId);
  if (spaceId) query = query.eq("space_id", spaceId);
  return query.order("sort_order", { ascending: true }) as unknown as Promise<{
    data: ReservationSpaceElement[] | null;
    error: { message: string } | null;
  }>;
}

export async function saveReservationSpaceElement(
  storeId: string,
  form: ReservationSpaceElementFormData
) {
  const payload = {
    store_id: storeId,
    space_id: form.space_id,
    element_type: form.element_type,
    label: form.label.trim() || null,
    pos_x: form.pos_x,
    pos_y: form.pos_y,
    width: form.width,
    height: form.height,
    rotation: form.rotation,
    is_locked: form.is_locked ?? false,
    sort_order: form.sort_order,
    updated_at: new Date().toISOString(),
  };
  if (form.id) {
    return supabase.from("reservation_space_elements").update(payload).eq("id", form.id).select().single();
  }
  return supabase.from("reservation_space_elements").insert(payload).select().single();
}

export async function deleteReservationSpaceElement(id: string) {
  return supabase.from("reservation_space_elements").delete().eq("id", id);
}

export async function updateReservationTableVisualPosition(
  tableId: string,
  posX: number,
  posY: number,
  rotation = 0
) {
  return supabase.from("reservation_tables").update({ pos_x: posX, pos_y: posY, rotation }).eq("id", tableId);
}

export async function updateReservationSpaceElementVisualPosition(
  elementId: string,
  posX: number,
  posY: number,
  rotation = 0
) {
  return supabase.from("reservation_space_elements").update({
    pos_x: posX, pos_y: posY, rotation, updated_at: new Date().toISOString()
  }).eq("id", elementId);
}

export async function updateReservationTableLocked(tableId: string, isLocked: boolean) {
  return supabase.from("reservation_tables").update({ is_locked: isLocked }).eq("id", tableId);
}

export async function updateReservationSpaceElementLocked(elementId: string, isLocked: boolean) {
  return supabase.from("reservation_space_elements").update({ is_locked: isLocked, updated_at: new Date().toISOString() }).eq("id", elementId);
}

export async function getReservationSlotsForAdmin(storeId: string) {
  return supabase.from("reservation_slots")
    .select("id, store_id, label, start_time, duration_minutes, days_of_week, is_active, sort_order")
    .eq("store_id", storeId).order("sort_order", { ascending: true });
}

export async function saveReservationSlot(storeId: string, form: ReservationSlotFormData) {
  const payload = {
    store_id: storeId, label: form.label, start_time: form.start_time,
    duration_minutes: form.duration_minutes, days_of_week: form.days_of_week,
    is_active: form.is_active, sort_order: form.sort_order,
  };
  if (form.id) return supabase.from("reservation_slots").update(payload).eq("id", form.id).select().single();
  return supabase.from("reservation_slots").insert(payload).select().single();
}

export async function deleteReservationSlot(id: string) {
  return supabase.from("reservation_slots").delete().eq("id", id);
}

const RESERVATION_ADMIN_SELECT = `
  id, store_id, table_id, slot_id, reservation_date, party_size,
  customer_name, customer_last_name, customer_email, customer_phone,
  notes, status, created_at, confirmed_at,
  reservation_tables ( name, capacity ),
  reservation_slots ( label, start_time )
`;

export async function getReservationsForAdmin(
  storeId: string,
  opts?: { date?: string; status?: ReservationStatus; range?: "upcoming" | "past" | "all" }
) {
  let query = supabase.from("reservations").select(RESERVATION_ADMIN_SELECT).eq("store_id", storeId);
  if (opts?.date) query = query.eq("reservation_date", opts.date);
  else if (opts?.range !== "all") {
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    query = opts?.range === "past"
      ? query.lt("reservation_date", localDate)
      : query.gte("reservation_date", localDate);
  }
  if (opts?.status) query = query.eq("status", opts.status);
  const ascending = opts?.range !== "past";
  return query.order("reservation_date", { ascending }).order("created_at", { ascending }) as unknown as Promise<{
    data: Reservation[] | null;
    error: { message: string } | null;
  }>;
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  return supabase.from("reservations").update({
    status, confirmed_at: status === "confirmed" ? new Date().toISOString() : null,
  }).eq("id", id).select().single();
}

export async function getPendingReservationsCount(storeId: string) {
  return supabase.from("reservations").select("id", { count: "exact", head: true })
    .eq("store_id", storeId).eq("status", "pending");
}

export async function getBlockedDatesForAdmin(storeId: string) {
  return supabase.from("reservation_blocked_dates")
    .select("id, store_id, blocked_date, reason, created_at")
    .eq("store_id", storeId)
    .order("blocked_date", { ascending: true }) as unknown as Promise<{
      data: BlockedDate[] | null;
      error: { message: string; code?: string } | null;
    }>;
}

export async function addBlockedDate(storeId: string, blockedDate: string, reason: string) {
  return supabase.from("reservation_blocked_dates")
    .insert({ store_id: storeId, blocked_date: blockedDate, reason: reason.trim() || null })
    .select().single();
}

export async function deleteBlockedDate(id: string) {
  return supabase.from("reservation_blocked_dates").delete().eq("id", id);
}

export async function getReservationsForWeek(storeId: string, startDate: string, endDate: string) {
  return supabase.from("reservations")
    .select(`id, reservation_date, status, party_size, slot_id,
      reservation_tables ( name ),
      reservation_slots ( label, start_time )`)
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
