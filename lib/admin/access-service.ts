import { supabase } from "@/lib/supabase";
import type {
  AdminAccess,
  AccessProfile,
  StoreMembership,
  StoreUserRole,
} from "@/lib/admin/access";

const VALID_STORE_ROLES: StoreUserRole[] = [
  "OWNER",
  "ADMIN",
  "OPERATIONS",
  "BILLER",
  "DISPATCHER",
  "DRIVER",
  "VIEWER",
];

function normalizeStoreRole(value: unknown): StoreUserRole {
  const normalized = String(value || "").trim().toUpperCase() as StoreUserRole;
  return VALID_STORE_ROLES.includes(normalized) ? normalized : "VIEWER";
}

export async function getCurrentAdminAccess(): Promise<{
  data: AdminAccess | null;
  error: string | null;
}> {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    return { data: null, error: sessionError.message };
  }

  const session = sessionData.session;

  if (!session?.user) {
    return { data: null, error: "NO_SESSION" };
  }

  const userId = session.user.id;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,active")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { data: null, error: profileError.message };
  }

  if (!profile) {
    return { data: null, error: "NO_PROFILE" };
  }

  const typedProfile = profile as AccessProfile;

  if (!typedProfile.active) {
    return { data: null, error: "PROFILE_INACTIVE" };
  }

  if (typedProfile.role === "super_admin") {
    return {
      data: {
        profile: typedProfile,
        isSuperAdmin: true,
        storeMembership: null,
        store: null,
      },
      error: null,
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("store_users")
    .select(
      `
      id,
      store_id,
      user_id,
      role,
      active,
      permissions,
      stores:store_id (
        id,
        name,
        slug,
        domain,
        logo_url,
        primary_color,
        secondary_color,
        is_active,
        module_store_enabled,
        module_landing_enabled,
        module_shipping_enabled
      )
    `
    )
    .eq("user_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return { data: null, error: membershipError.message };
  }

  if (!membership) {
    return { data: null, error: "NO_STORE_ACCESS" };
  }

  const typedMembership = {
    ...(membership as unknown as StoreMembership),
    role: normalizeStoreRole((membership as { role?: unknown }).role),
  };

  if (typedMembership.stores?.is_active === false) {
    return { data: null, error: "STORE_INACTIVE" };
  }

  return {
    data: {
      profile: typedProfile,
      isSuperAdmin: false,
      storeMembership: typedMembership,
      store: typedMembership.stores,
    },
    error: null,
  };
}
