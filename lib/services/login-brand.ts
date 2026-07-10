import { supabase } from "@/lib/supabase";

const PLATFORM_DOMAIN = "perlamarketplace.com";

export type LoginBrand = {
  storeId: string | null;
  storeSlug: string | null;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  subtitle: string;
  isPlatform: boolean;
};

const PLATFORM_BRAND: LoginBrand = {
  storeId: null,
  storeSlug: null,
  name: "Perla Marketplace",
  logoUrl: null,
  primaryColor: "#6D28D9",
  secondaryColor: "#DB2777",
  subtitle: "Accede al panel de administración",
  isPlatform: true,
};

type StoreBrandRow = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  subdomain: string | null;
};

function normalizeHostname(hostname: string) {
  return hostname
    .toLowerCase()
    .trim()
    .split(":")[0]
    .replace(/^www\./, "");
}

function getPlatformSubdomain(hostname: string) {
  if (!hostname.endsWith(`.${PLATFORM_DOMAIN}`)) return null;

  const value = hostname.slice(0, -(`.${PLATFORM_DOMAIN}`.length)).trim();

  if (!value || value === "www") return null;

  return value;
}

function mapStoreToBrand(store: StoreBrandRow): LoginBrand {
  return {
    storeId: store.id,
    storeSlug: store.slug,
    name: store.name,
    logoUrl: store.logo_url,
    primaryColor: store.primary_color || "#061B3A",
    secondaryColor: store.secondary_color || store.primary_color || "#2563EB",
    subtitle: "Panel administrativo",
    isPlatform: false,
  };
}

export async function getLoginBrandByHostname(
  rawHostname: string
): Promise<LoginBrand> {
  const hostname = normalizeHostname(rawHostname);

  if (
    !hostname ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === PLATFORM_DOMAIN
  ) {
    return PLATFORM_BRAND;
  }

  const subdomain = getPlatformSubdomain(hostname);

  if (subdomain) {
    const { data, error } = await supabase
      .from("stores")
      .select(
        "id, name, slug, domain, logo_url, primary_color, secondary_color, subdomain"
      )
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle<StoreBrandRow>();

    if (error) {
      console.error("Error cargando branding por subdominio:", error);
      return PLATFORM_BRAND;
    }

    return data ? mapStoreToBrand(data) : PLATFORM_BRAND;
  }

  /*
   * Dominios personalizados, por ejemplo:
   * aguilacubaexpress.com/login
   */
  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, name, slug, domain, logo_url, primary_color, secondary_color, subdomain"
    )
    .eq("domain", hostname)
    .eq("is_active", true)
    .maybeSingle<StoreBrandRow>();

  if (error) {
    console.error("Error cargando branding por dominio:", error);
    return PLATFORM_BRAND;
  }

  return data ? mapStoreToBrand(data) : PLATFORM_BRAND;
}
