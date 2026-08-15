/* =========================================================
   MÓDULO DE RESERVAS — TIPOS
========================================================= */

export type SeatType = "chairs" | "sofa" | "stools";

export type ReservationTable = {
  id: string;
  store_id: string;
  name: string;
  capacity: number;
  seat_type: SeatType;
  zone: string | null;
  pos_row: number;
  pos_col: number;
  is_active: boolean;
  sort_order: number;
};

export type ReservationTableFormData = {
  id?: string;
  name: string;
  capacity: number;
  seat_type: SeatType;
  zone: string;
  pos_row: number;
  pos_col: number;
  is_active: boolean;
  sort_order: number;
};

export type ReservationSlot = {
  id: string;
  store_id: string;
  label: string;
  start_time: string; // "HH:MM:SS"
  duration_minutes: number;
  days_of_week: number[]; // 0=domingo … 6=sábado
  is_active: boolean;
  sort_order: number;
};

export type ReservationSlotFormData = {
  id?: string;
  label: string;
  start_time: string; // "HH:MM"
  duration_minutes: number;
  days_of_week: number[];
  is_active: boolean;
  sort_order: number;
};

export type ReservationStatus = "pending" | "confirmed" | "rejected" | "cancelled";

export type Reservation = {
  id: string;
  store_id: string;
  table_id: string;
  slot_id: string;
  reservation_date: string; // "YYYY-MM-DD"
  party_size: number;
  customer_name: string;
  customer_phone: string;
  notes: string | null;
  status: ReservationStatus;
  created_at: string;
  confirmed_at: string | null;
  reservation_tables?: { name: string; capacity: number } | null;
  reservation_slots?: { label: string; start_time: string } | null;
};

/** Estado de disponibilidad de una mesa para una fecha/franja
 *  específica, tal como lo ve el portal público — solo lo mínimo
 *  necesario para pintar el croquis, nunca datos del cliente que
 *  ocupa la mesa. */
export type TableAvailability = ReservationTable & {
  is_available: boolean;
};

export const SEAT_TYPE_LABEL: Record<SeatType, string> = {
  chairs: "Sillas",
  sofa: "Sofá",
  stools: "Banquetas",
};

export const DAY_LABEL: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};
