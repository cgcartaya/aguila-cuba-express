export type AdminArea = "store" | "saas";

export type PlatformRole = "super_admin" | "store_owner";

export type StoreUserRole =
  | "OWNER"
  | "ADMIN"
  | "OPERATIONS"
  | "BILLER"
  | "DISPATCHER"
  | "DRIVER"
  | "VIEWER";

export type StorePermissions = Record<string, boolean>;

export type AccessProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: PlatformRole;
  active: boolean;
};

export type AccessStore = {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  is_active?: boolean;
  module_store_enabled?: boolean;
  module_landing_enabled?: boolean;
  module_shipping_enabled?: boolean;
};

export type StoreMembership = {
  id: string;
  store_id: string;
  user_id: string;
  role: StoreUserRole;
  active: boolean;
  permissions?: StorePermissions | null;
  stores: AccessStore | null;
};

export type AdminAccess = {
  profile: AccessProfile;
  isSuperAdmin: boolean;
  storeMembership: StoreMembership | null;
  store: AccessStore | null;
};
