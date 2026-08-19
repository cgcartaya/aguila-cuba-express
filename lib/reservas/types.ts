/* =========================================================
   MÓDULO DE RESERVAS — TIPOS
========================================================= */

export type SeatType = "chairs" | "sofa" | "stools";

export type ReservationSpaceType =
  | "indoor"
  | "terrace"
  | "bar"
  | "outdoor"
  | "private"
  | "floor";

export type ReservationSpace = {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  space_type: ReservationSpaceType;
  floor_label: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type ReservationSpaceFormData = {
  id?: string;
  name: string;
  description: string;
  space_type: ReservationSpaceType;
  floor_label: string;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

export type ReservationTable = {
  id: string;
  store_id: string;
  name: string;
  capacity: number;
  seat_type: SeatType;
  zone: string | null;
  space_id: string | null;
  pos_row: number;
  pos_col: number;
  pos_x: number;
  pos_y: number;
  rotation: number;
  table_shape: "round" | "square" | "rect";
  is_active: boolean;
  sort_order: number;
};

export type ReservationTableFormData = {
  id?: string;
  name: string;
  capacity: number;
  seat_type: SeatType;
  zone: string;
  space_id: string | null;
  pos_row: number;
  pos_col: number;
  pos_x: number;
  pos_y: number;
  rotation: number;
  table_shape: "round" | "square" | "rect";
  is_active: boolean;
  sort_order: number;
};

export type ReservationSlot = {
  id: string;
  store_id: string;
  label: string;
  start_time: string;
  duration_minutes: number;
  days_of_week: number[];
  is_active: boolean;
  sort_order: number;
};

export type ReservationSlotFormData = {
  id?: string;
  label: string;
  start_time: string;
  duration_minutes: number;
  days_of_week: number[];
  is_active: boolean;
  sort_order: number;
};

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled";

export type Reservation = {
  id: string;
  store_id: string;
  table_id: string;
  slot_id: string;
  reservation_date: string;
  party_size: number;
  customer_name: string;
  customer_last_name: string;
  customer_email: string | null;
  customer_phone: string;
  notes: string | null;
  status: ReservationStatus;
  created_at: string;
  confirmed_at: string | null;
  cancel_token?: string;
  reminder_sent_at?: string | null;
  reservation_tables?: { name: string; capacity: number } | null;
  reservation_slots?: { label: string; start_time: string } | null;
};

export type BlockedDate = {
  id: string;
  store_id: string;
  blocked_date: string;
  reason: string | null;
  created_at: string;
};

export type TableAvailability = ReservationTable & {
  is_available: boolean;
};

export const SEAT_TYPE_LABEL: Record<SeatType, string> = {
  chairs: "Sillas",
  sofa: "Sofá",
  stools: "Banquetas",
};

export const SPACE_TYPE_LABEL: Record<ReservationSpaceType, string> = {
  indoor: "Salón interior",
  terrace: "Terraza",
  bar: "Bar",
  outdoor: "Exterior / Patio",
  private: "Salón privado",
  floor: "Piso / Nivel",
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


export type ReservationSpaceElementType =
  | "wall"
  | "door"
  | "window"
  | "bar"
  | "entrance"
  | "plant"
  | "restroom"
  | "stool"
  | "stairs"
  | "label";

export type ReservationSpaceElement = {
  id: string;
  store_id: string;
  space_id: string;
  element_type: ReservationSpaceElementType;
  label: string | null;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  rotation: number;
  sort_order: number;
};

export type ReservationSpaceElementFormData = {
  id?: string;
  space_id: string;
  element_type: ReservationSpaceElementType;
  label: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  rotation: number;
  sort_order: number;
};

export const SPACE_ELEMENT_LABEL: Record<ReservationSpaceElementType, string> = {
  wall: "Pared",
  door: "Puerta",
  window: "Ventana",
  bar: "Barra",
  entrance: "Entrada",
  plant: "Planta",
  restroom: "Baño",
  stool: "Banqueta",
  stairs: "Escalera",
  label: "Texto",
};
