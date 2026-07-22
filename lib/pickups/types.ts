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

export type PickupCoverageMode = "country" | "region" | "cities" | "postal_codes" | "radius";
export type AddressValidationProvider = "auto" | "google" | "postal" | "manual";

export type PickupServiceSettings = {
  id: string;
  store_id: string;
  is_enabled: boolean;
  country_code: string;
  country_name: string | null;
  region_name: string | null;
  region_code: string | null;
  base_city: string | null;
  timezone: string;
  currency_code: string;
  pickup_fee: number;
  max_preferred_dates: number;
  public_headline: string | null;
  public_description: string | null;
  coverage_mode: PickupCoverageMode;
  city_selection_mode?: "all_region" | "selected";
  allowed_cities: string[];
  allowed_postal_codes: string[];
  base_latitude: number | null;
  base_longitude: number | null;
  coverage_radius_km: number | null;
  require_verified_address: boolean;
  address_validation_provider: AddressValidationProvider;
  confirmation_message: string | null;
};

export type PickupRequest = {
  id: string;
  store_id: string;
  request_code: string;
  customer_name: string;
  phone: string;
  email: string | null;
  address_line_1: string;
  address_line_2: string | null;
  formatted_address: string | null;
  city: string;
  region: string;
  postal_code: string;
  country_code: string;
  county: string | null;
  place_id: string | null;
  address_verified: boolean;
  validation_provider: string | null;
  latitude: number | null;
  longitude: number | null;
  package_count: number;
  estimated_weight: number | null;
  package_type: string | null;
  needs_box: boolean;
  needs_packing_help: boolean;
  notes: string | null;
  status: PickupRequestStatus;
  suggested_zone_id: string | null;
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
