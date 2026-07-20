import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PLATFORM_DOMAIN = "perlamarketplace.com";

function getStoreKey(request: NextRequest) {
  const host = (request.headers.get("host") || "")
    .split(":")[0]
    .replace(/^www\./, "")
    .toLowerCase()
    .trim();

  if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return {
      type: "subdomain" as const,
      value: host.slice(0, -(`.${PLATFORM_DOMAIN}`.length)),
    };
  }

  return { type: "domain" as const, value: host };
}

export async function GET(request: NextRequest) {
  const key = getStoreKey(request);

  let storeQuery = supabaseAdmin
    .from("stores")
    .select(
      "id,name,slug,logo_url,primary_color,secondary_color,subdomain,domain,module_landing_enabled,module_shipping_enabled"
    )
    .eq("is_active", true);

  storeQuery =
    key.type === "subdomain"
      ? storeQuery.eq("subdomain", key.value)
      : storeQuery.eq("domain", key.value);

  const { data: store, error: storeError } = await storeQuery.maybeSingle();

  if (storeError) {
    console.error("Quote config store error:", storeError);
    return NextResponse.json(
      { error: "No se pudo resolver la empresa." },
      { status: 500 }
    );
  }

  if (!store) {
    return NextResponse.json(
      { error: "Empresa no encontrada." },
      { status: 404 }
    );
  }

  const [
    settingsResult,
    servicesResult,
    countriesResult,
    provincesResult,
    municipalitiesResult,
    locationsResult,
    rulesResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("customer_portal_settings")
      .select("*")
      .eq("store_id", store.id)
      .eq("is_enabled", true)
      .maybeSingle(),
    supabaseAdmin
      .from("shipping_service_types")
      .select("id,name,code,billing_mode")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("shipping_countries")
      .select("id,name,code")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("shipping_provinces")
      .select("id,name,country_id,code")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("shipping_municipalities")
      .select("id,name,province_id,code,is_capital")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("shipping_locations")
      .select("id,name,municipality_id")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabaseAdmin
      .from("quote_rate_rules")
      .select(
        "id,service_type_id,country_id,province_id,municipality_id,location_id,item_category,transport_mode,billing_mode,rate,minimum_weight_lb,maximum_weight_lb,minimum_charge,fixed_fee,estimated_days_min,estimated_days_max,priority,is_active"
      )
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("priority", { ascending: false }),
  ]);

  const queryError = [
    settingsResult.error,
    servicesResult.error,
    countriesResult.error,
    provincesResult.error,
    municipalitiesResult.error,
    locationsResult.error,
    rulesResult.error,
  ].find(Boolean);

  if (queryError) {
    console.error("Quote config query error:", queryError);
    return NextResponse.json(
      { error: "No se pudo cargar la configuración del cotizador." },
      { status: 500 }
    );
  }

  const settings = settingsResult.data;

  if (!settings?.quote_enabled) {
    return NextResponse.json(
      { error: "El cotizador no está disponible." },
      { status: 404 }
    );
  }

  const rules = rulesResult.data || [];
  const serviceIdsWithRules = new Set(
    rules.map((rule) => rule.service_type_id).filter(Boolean)
  );

  const services = (servicesResult.data || []).filter(
    (service) =>
      serviceIdsWithRules.size === 0 || serviceIdsWithRules.has(service.id)
  );

  const countries = countriesResult.data || [];
  const provinces = provincesResult.data || [];
  const municipalities = municipalitiesResult.data || [];
  const locations = locationsResult.data || [];

  const categories = [
    ...new Set(rules.map((rule) => rule.item_category).filter(Boolean)),
  ];

  const transportModes = [
    ...new Set(rules.map((rule) => rule.transport_mode).filter(Boolean)),
  ];

  const readiness = {
    ready: services.length > 0 && countries.length > 0 && rules.length > 0,
    hasServices: services.length > 0,
    hasCountries: countries.length > 0,
    hasRules: rules.length > 0,
    serviceCount: services.length,
    countryCount: countries.length,
    provinceCount: provinces.length,
    municipalityCount: municipalities.length,
    ruleCount: rules.length,
  };

  return NextResponse.json({
    store,
    settings,
    services,
    countries,
    provinces,
    municipalities,
    locations,
    rules,
    categories,
    transportModes,
    readiness,
  });
}
