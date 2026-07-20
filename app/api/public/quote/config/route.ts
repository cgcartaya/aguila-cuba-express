import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PLATFORM_DOMAIN = "perlamarketplace.com";

function getStoreKey(request: NextRequest) {
  const host = (request.headers.get("host") || "")
    .split(":")[0]
    .replace(/^www\./, "")
    .toLowerCase()
    .trim();

  return host.endsWith(`.${PLATFORM_DOMAIN}`)
    ? { type: "subdomain" as const, value: host.slice(0, -(`.${PLATFORM_DOMAIN}`.length)) }
    : { type: "domain" as const, value: host };
}

export async function GET(request: NextRequest) {
  const key = getStoreKey(request);
  let storeQuery = supabaseAdmin
    .from("stores")
    .select("id,name,slug,logo_url,primary_color,secondary_color,subdomain,domain,module_landing_enabled,module_shipping_enabled")
    .eq("is_active", true);

  storeQuery = key.type === "subdomain"
    ? storeQuery.eq("subdomain", key.value)
    : storeQuery.eq("domain", key.value);

  const { data: store, error: storeError } = await storeQuery.maybeSingle();
  if (storeError || !store) {
    console.error("PUBLIC QUOTE CONFIG STORE ERROR", storeError);
    return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
  }

  const [settingsResult, servicesResult, countriesResult, provincesResult, municipalitiesResult, locationsResult, ratesResult] = await Promise.all([
    supabaseAdmin.from("customer_portal_settings").select("*").eq("store_id", store.id).eq("is_enabled", true).maybeSingle(),
    supabaseAdmin.from("shipping_service_types").select("id,name,code,billing_mode").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("shipping_countries").select("id,name,code").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("shipping_provinces").select("id,name,country_id,code").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("shipping_municipalities").select("id,name,province_id,code,is_capital").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("shipping_locations").select("id,name,municipality_id").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
    supabaseAdmin.from("shipping_rates").select("id,service_type_id,transport_mode").eq("store_id", store.id).eq("is_active", true),
  ]);

  const queryError = [settingsResult.error, servicesResult.error, countriesResult.error, provincesResult.error, municipalitiesResult.error, locationsResult.error, ratesResult.error].find(Boolean);
  if (queryError) {
    console.error("PUBLIC QUOTE CONFIG QUERY ERROR", queryError);
    return NextResponse.json({ error: "No se pudo cargar la configuración del cotizador." }, { status: 500 });
  }

  const settings = settingsResult.data;
  if (!settings?.quote_enabled) {
    return NextResponse.json({ error: "El cotizador no está disponible." }, { status: 404 });
  }

  const rates = ratesResult.data || [];
  const serviceIdsWithRates = new Set(rates.map((rate) => rate.service_type_id));
  const services = (servicesResult.data || []).filter((service) => serviceIdsWithRates.has(service.id));
  const transportModes = [...new Set(rates.map((rate) => rate.transport_mode).filter(Boolean))];
  const countries = countriesResult.data || [];

  const readiness = {
    ready: services.length > 0 && countries.length > 0 && rates.length > 0,
    hasServices: services.length > 0,
    hasCountries: countries.length > 0,
    hasRules: rates.length > 0,
    serviceCount: services.length,
    countryCount: countries.length,
    ruleCount: rates.length,
  };

  return NextResponse.json({
    store,
    settings,
    services,
    countries,
    provinces: provincesResult.data || [],
    municipalities: municipalitiesResult.data || [],
    locations: locationsResult.data || [],
    categories: ["service"],
    transportModes,
    readiness,
  });
}
