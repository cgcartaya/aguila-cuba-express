export type PickupRequestStatus =
  | "new"
  | "contacted"
  | "pending_confirmation"
  | "confirmed"
  | "assigned"
  | "en_route"
  | "picked_up"
  | "failed"
  | "cancelled";

export type PickupRequest = {
  id: string;
  store_id: string;
  request_code: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  region: string;
  postal_code: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  package_count: number;
  estimated_weight: number | null;
  package_type: string | null;
  needs_box: boolean;
  needs_packing_help: boolean;
  notes: string | null;
  status: PickupRequestStatus;
  assigned_zone_id: string | null;
  confirmed_date: string | null;
  created_at: string;
  preferred_dates?: string[];
};

export type CreatePickupRequestInput = {
  store_slug: string;
  customer_name: string;
  phone: string;
  email?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  region: string;
  postal_code: string;
  country_code?: string;
  preferred_dates: string[];
  package_count: number;
  estimated_weight?: number | null;
  package_type?: string;
  needs_box?: boolean;
  needs_packing_help?: boolean;
  notes?: string;
};

export const PICKUP_STATUS_LABELS: Record<PickupRequestStatus, string> = {
  new: "Nueva",
  contacted: "Contactada",
  pending_confirmation: "Pendiente de confirmar",
  confirmed: "Confirmada",
  assigned: "Asignada a ruta",
  en_route: "En camino",
  picked_up: "Recogida",
  failed: "No se pudo recoger",
  cancelled: "Cancelada",
};
