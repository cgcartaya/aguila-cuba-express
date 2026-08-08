export type StaffRole = "ADMIN" | "SUPERVISOR" | "OPERATOR" | "DELIVERY";
export type StaffStatus = "ACTIVE" | "VACATION" | "SUSPENDED";

export type StaffUser = {
  id: string;
  store_id: string;
  username: string;
  role: StaffRole;
  status: StaffStatus;
  first_name: string;
  last_name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  photo_url: string | null;
  vehicle_type: string | null;
  vehicle_plate: string | null;
  notes: string | null;
  last_login: string | null;
  last_sync: string | null;
  created_at: string;
  updated_at: string;
  legacy_app_user_id?: string | null;
};

export type StaffUserInput = {
  store_id: string;
  username: string;
  password: string;
  role: StaffRole;
  status: StaffStatus;
  first_name: string;
  last_name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  photo_url?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  notes?: string;
};

export type StaffShipment = {
  id: string;
  order_number: number | null;
  trip_order: number | null;
  tracking_code: string | null;
  recipient_name: string | null;
  recipient_address: string | null;
  recipient_phone: string | null;
  location: string | null;
  status: string;
  delivered: boolean;
  delivered_date: string | null;
  created_at: string;
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
};

export type StaffAnalyticsShipment = {
  id: string;
  trip_id: string | null;
  assigned_staff_id: string | null;
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
  status: string;
  delivered: boolean;
  created_at: string;
  delivered_date: string | null;
};

export type StaffAnalyticsTrip = {
  id: string;
  trip_number: number;
  name: string;
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  OPERATOR: "Operador",
  DELIVERY: "Repartidor",
};

export const STAFF_STATUS_LABELS: Record<StaffStatus, string> = {
  ACTIVE: "Activo",
  VACATION: "Vacaciones",
  SUSPENDED: "Suspendido",
};
