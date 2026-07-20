import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const PLATFORM_DOMAIN = "perlamarketplace.com";

function getStoreKey(request: NextRequest) {
  const host = (request.headers.get("host") || "")
    .split(":")[0]
    .replace(/^www\./, "")
    .toLowerCase();

  if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return { type: "subdomain" as const, value: host.slice(0, -(`.${PLATFORM_DOMAIN}`.length)) };
  }

  return { type: "domain" as const, value: host };
}

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Falta configurar Supabase." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const key = getStoreKey(request);

  let storeQuery = supabase
    .from("stores")
    .select("id,name,logo_url,primary_color,secondary_color,subdomain,domain,module_landing_enabled,module_shipping_enabled")
    .eq("is_active", true);

  storeQuery = key.type === "subdomain"
    ? storeQuery.eq("subdomain", key.value)
    : storeQuery.eq("domain", key.value);

  const { data: store, error: storeError } = await storeQuery.maybeSingle();

  if (storeError || !store) {
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }

  const [settingsResult, servicesResult, countriesResult, provincesResult, municipalitiesResult, locationsResult, rulesResult] = await Promise.all([
    supabase.from("customer_portal_settings").select("*").eq("store_id", store.id).eq("is_enabled", true).maybeSingle(),
    supabase.from("shipping_service_types").select("id,name,code,billing_mode").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabase.from("shipping_countries").select("id,name").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabase.from("shipping_provinces").select("id,name,country_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabase.from("shipping_municipalities").select("id,name,province_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabase.from("shipping_locations").select("id,name,municipality_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabase.from("quote_rate_rules").select("id,service_type_id,item_category,transport_mode,is_active").eq("store_id", store.id).eq("is_active", true),
  ]);

  if (!settingsResult.data?.quote_enabled) {
    return NextResponse.json({ error: "El cotizador no está disponible." }, { status: 404 });
  }

  const queryError = [
    servicesResult.error,
    countriesResult.error,
    provincesResult.error,
    municipalitiesResult.error,
    locationsResult.error,
    rulesResult.error,
  ].find(Boolean);

  if (queryError) {
    console.error("Quote config error:", queryError);
    return NextResponse.json({ error: "No se pudo cargar la configuración del cotizador." }, { status: 500 });
  }

  const rules = rulesResult.data || [];
  const serviceIdsWithRules = new Set(rules.map((rule) => rule.service_type_id).filter(Boolean));
  const services = (servicesResult.data || []).filter((service) => serviceIdsWithRules.size === 0 || serviceIdsWithRules.has(service.id));
  const categories = [...new Set(rules.map((rule) => rule.item_category).filter(Boolean))];
  const transportModes = [...new Set(rules.map((rule) => rule.transport_mode).filter(Boolean))];

  const readiness = {
    ready: services.length > 0 && (countriesResult.data || []).length > 0 && rules.length > 0,
    hasServices: services.length > 0,
    hasCountries: (countriesResult.data || []).length > 0,
    hasRules: rules.length > 0,
    serviceCount: services.length,
    countryCount: (countriesResult.data || []).length,
    ruleCount: rules.length,
  };

  return NextResponse.json({
    store,
    settings: settingsResult.data,
    services,
    countries: countriesResult.data || [],
    provinces: provincesResult.data || [],
    municipalities: municipalitiesResult.data || [],
    locations: locationsResult.data || [],
    categories,
    transportModes,
    readiness,
  });
}
