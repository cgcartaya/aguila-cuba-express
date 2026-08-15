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
        module_shipping_enabled,
        module_pickups_enabled,
        module_menu_enabled,
        module_reservas_enabled,
        platform_fee_enabled
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

/* =========================================================
   CACHE COMPARTIDA

   useAdminAccess() se usa en decenas de componentes (nav, menús,
   layout, cada página del admin). Sin esto, cada uno dispara sus
   propias consultas a `profiles` + `store_users` por separado —
   en una sola pantalla se pueden acumular 10+ peticiones
   idénticas compitiendo por conexión con el resto de la página
   (imágenes incluidas).

   Esta cache comparte una misma promesa en vuelo entre llamadas
   simultáneas, y guarda el resultado un rato corto para que los
   componentes que montan casi al mismo tiempo (típico al navegar
   entre páginas del admin) no vuelvan a pedirlo.
========================================================= */

type AdminAccessResult = {
  data: AdminAccess | null;
  error: string | null;
};

let cachedResult: AdminAccessResult | null = null;
let cachedAt = 0;
let inFlight: Promise<AdminAccessResult> | null = null;

const CACHE_TTL_MS = 5000;

export async function getCurrentAdminAccessCached(
  options: { forceRefresh?: boolean } = {}
): Promise<AdminAccessResult> {
  const { forceRefresh = false } = options;
  const now = Date.now();

  if (!forceRefresh && cachedResult && now - cachedAt < CACHE_TTL_MS) {
    return cachedResult;
  }

  if (!forceRefresh && inFlight) {
    return inFlight;
  }

  inFlight = getCurrentAdminAccess().then((result) => {
    cachedResult = result;
    cachedAt = Date.now();
    inFlight = null;
    return result;
  });

  return inFlight;
}

export function invalidateAdminAccessCache() {
  cachedResult = null;
  cachedAt = 0;
  inFlight = null;
}
