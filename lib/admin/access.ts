export type AdminArea = "store" | "saas";

export type PlatformRole = "super_admin" | "store_owner";
export type StoreUserRole = "owner";

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
};

export type StoreMembership = {
  id: string;
  store_id: string;
  user_id: string;
  role: StoreUserRole;
  active: boolean;
  stores: AccessStore | null;
};

export type AdminAccess = {
  profile: AccessProfile;
  isSuperAdmin: boolean;
  storeMembership: StoreMembership | null;
  store: AccessStore | null;
};
