import { supabaseAdmin } from "@/lib/supabase-admin";

export type PickupCoverageSettings = {
  id: string;
  store_id: string;
  is_enabled: boolean;
  country_code: string;
  country_name: string | null;
  region_name: string | null;
  region_code: string | null;
  base_city: string | null;
  coverage_mode: "country" | "region" | "cities" | "postal_codes" | "radius";
  allowed_cities: string[];
  allowed_postal_codes: string[];
  base_latitude: number | null;
  base_longitude: number | null;
  coverage_radius_km: number | null;
  require_verified_address: boolean;
  address_validation_provider: "auto" | "google" | "postal" | "manual";
};

export type AddressValidationInput = {
  storeSlug: string;
  addressLine1: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode?: string;
};

export type ValidatedPickupAddress = {
  valid: boolean;
  verified: boolean;
  inCoverage: boolean;
  message: string;
  provider: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  region: string;
  regionCode: string;
  postalCode: string;
  countryCode: string;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  placeId: string | null;
  suggestedZoneId: string | null;
  suggestedZoneName: string | null;
  raw?: unknown;
};

function clean(value: unknown, max = 180) {
  return String(value ?? "").trim().slice(0, max);
}

function norm(value: unknown) {
  return clean(value).toLocaleLowerCase("en-US").replace(/[^a-z0-9]/g, "");
}

function sameLoose(a: unknown, b: unknown) {
  const left = norm(a);
  const right = norm(b);
  return Boolean(left && right && (left === right || left.includes(right) || right.includes(left)));
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => clean(item, 100)).filter(Boolean) : [];
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function resolveStoreAndSettings(storeSlug: string) {
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, slug, is_active")
    .eq("slug", storeSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (!store) return null;

  const { data: rawSettings } = await supabaseAdmin
    .from("pickup_service_settings")
    .select("*")
    .eq("store_id", store.id)
    .maybeSingle();

  if (!rawSettings?.is_enabled) return null;

  const settings: PickupCoverageSettings = {
    ...rawSettings,
    allowed_cities: asStringArray(rawSettings.allowed_cities),
    allowed_postal_codes: asStringArray(rawSettings.allowed_postal_codes),
    base_latitude: rawSettings.base_latitude == null ? null : Number(rawSettings.base_latitude),
    base_longitude: rawSettings.base_longitude == null ? null : Number(rawSettings.base_longitude),
    coverage_radius_km: rawSettings.coverage_radius_km == null ? null : Number(rawSettings.coverage_radius_km),
  };

  return { store, settings };
}

async function findSuggestedZone(storeId: string, city: string, postalCode: string, county?: string | null) {
  const { data } = await supabaseAdmin
    .from("pickup_zone_locations")
    .select("zone_id, name, postal_code, location_type, pickup_zones!inner(name, is_active)")
    .eq("store_id", storeId)
    .eq("is_active", true);

  const match = (data || []).find((row: any) => {
    if (!row.pickup_zones?.is_active) return false;
    if (row.location_type === "postal_code" && row.postal_code) return norm(row.postal_code) === norm(postalCode);
    if (row.location_type === "county" && county) return sameLoose(row.name, county);
    return sameLoose(row.name, city);
  });

  return match
    ? { id: match.zone_id as string, name: String((match as any).pickup_zones?.name || "") }
    : { id: null, name: null };
}

function evaluateCoverage(settings: PickupCoverageSettings, address: Omit<ValidatedPickupAddress, "valid" | "verified" | "inCoverage" | "message" | "provider" | "suggestedZoneId" | "suggestedZoneName">) {
  const countryOk = sameLoose(address.countryCode, settings.country_code);
  if (!countryOk) return false;

  if (settings.coverage_mode === "country") return true;
  if (settings.coverage_mode === "region") {
    return sameLoose(address.regionCode, settings.region_code) || sameLoose(address.region, settings.region_name);
  }
  if (settings.coverage_mode === "cities") {
    return settings.allowed_cities.some((city) => sameLoose(city, address.city));
  }
  if (settings.coverage_mode === "postal_codes") {
    return settings.allowed_postal_codes.some((postalCode) => norm(postalCode) === norm(address.postalCode));
  }
  if (settings.coverage_mode === "radius") {
    if (settings.base_latitude == null || settings.base_longitude == null || settings.coverage_radius_km == null || address.latitude == null || address.longitude == null) return false;
    return distanceKm(settings.base_latitude, settings.base_longitude, address.latitude, address.longitude) <= settings.coverage_radius_km;
  }
  return false;
}

async function validateWithGoogle(input: AddressValidationInput, settings: PickupCoverageSettings) {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;
  if (!apiKey) return null;

  const query = [input.addressLine1, input.city, input.region, input.postalCode, input.countryCode || settings.country_code]
    .filter(Boolean)
    .join(", ");
  const url = new URL(`https://geocode.googleapis.com/v4/geocode/address/${encodeURIComponent(query)}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set(
    "fields",
    "results.formattedAddress,results.addressComponents,results.location,results.placeId,results.granularity"
  );

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) return null;
  const payload = await response.json();
  const result = payload?.results?.[0];
  if (!result) return null;

  const components = result.addressComponents || [];
  const value = (type: string, short = false) => {
    const component = components.find((item: any) => item.types?.includes(type));
    return component ? String(short ? component.shortText : component.longText) : "";
  };

  const streetNumber = value("street_number");
  const route = value("route");
  const city = value("locality") || value("postal_town") || value("administrative_area_level_2");
  const region = value("administrative_area_level_1");
  const regionCode = value("administrative_area_level_1", true);
  const postalCode = value("postal_code");
  const countryCode = value("country", true);

  return {
    formattedAddress: result.formattedAddress || query,
    addressLine1: [streetNumber, route].filter(Boolean).join(" ") || input.addressLine1,
    city: city || input.city,
    region: region || input.region,
    regionCode: regionCode || input.region,
    postalCode: postalCode || input.postalCode,
    countryCode: countryCode || input.countryCode || settings.country_code,
    county: value("administrative_area_level_2") || null,
    latitude: Number(result.location?.latitude) || null,
    longitude: Number(result.location?.longitude) || null,
    placeId: result.placeId || null,
    raw: { granularity: result.granularity || null },
  };
}

async function validateUsPostal(input: AddressValidationInput, settings: PickupCoverageSettings) {
  const postalCode = clean(input.postalCode, 12);
  if (!/^\d{5}(?:-\d{4})?$/.test(postalCode)) return null;

  const response = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(postalCode.slice(0, 5))}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const places = Array.isArray(payload?.places) ? payload.places : [];
  const matchedPlace = places.find((place: any) => sameLoose(place["place name"], input.city)) || places[0];
  if (!matchedPlace) return null;

  return {
    formattedAddress: [input.addressLine1, matchedPlace["place name"], matchedPlace["state abbreviation"], postalCode].filter(Boolean).join(", "),
    addressLine1: input.addressLine1,
    city: String(matchedPlace["place name"] || input.city),
    region: String(matchedPlace.state || input.region),
    regionCode: String(matchedPlace["state abbreviation"] || input.region),
    postalCode,
    countryCode: "US",
    county: null,
    latitude: Number(matchedPlace.latitude) || null,
    longitude: Number(matchedPlace.longitude) || null,
    placeId: null,
    raw: { places_count: places.length },
  };
}

export async function validatePickupAddress(input: AddressValidationInput): Promise<ValidatedPickupAddress> {
  const storeSlug = clean(input.storeSlug, 100).toLowerCase();
  const addressLine1 = clean(input.addressLine1);
  const city = clean(input.city, 100);
  const region = clean(input.region, 100);
  const postalCode = clean(input.postalCode, 20);
  const countryCode = clean(input.countryCode || "US", 2).toUpperCase();

  if (!storeSlug || addressLine1.length < 5 || city.length < 2 || region.length < 2 || postalCode.length < 3) {
    return {
      valid: false, verified: false, inCoverage: false,
      message: "Completa una dirección, ciudad, estado o provincia y código postal válidos.",
      provider: "none", formattedAddress: "", addressLine1, city, region, regionCode: region,
      postalCode, countryCode, county: null, latitude: null, longitude: null, placeId: null,
      suggestedZoneId: null, suggestedZoneName: null,
    };
  }

  const resolved = await resolveStoreAndSettings(storeSlug);
  if (!resolved) {
    return {
      valid: false, verified: false, inCoverage: false,
      message: "El servicio de recogidas no está disponible para esta tienda.", provider: "none",
      formattedAddress: "", addressLine1, city, region, regionCode: region, postalCode, countryCode,
      county: null, latitude: null, longitude: null, placeId: null, suggestedZoneId: null, suggestedZoneName: null,
    };
  }

  const { store, settings } = resolved;
  let normalized: any = null;
  let provider = "manual";

  if (settings.address_validation_provider === "google" || settings.address_validation_provider === "auto") {
    normalized = await validateWithGoogle({ ...input, countryCode }, settings);
    if (normalized) provider = "google";
  }

  if (!normalized && countryCode === "US" && ["postal", "auto"].includes(settings.address_validation_provider)) {
    normalized = await validateUsPostal({ ...input, countryCode }, settings);
    if (normalized) provider = "postal";
  }

  if (!normalized) {
    normalized = {
      formattedAddress: [addressLine1, city, region, postalCode].filter(Boolean).join(", "),
      addressLine1, city, region, regionCode: region, postalCode, countryCode,
      county: null, latitude: null, longitude: null, placeId: null, raw: null,
    };
  }

  const inputMatches = provider === "manual" || (sameLoose(input.city, normalized.city) && (sameLoose(input.region, normalized.region) || sameLoose(input.region, normalized.regionCode)) && norm(input.postalCode).startsWith(norm(normalized.postalCode).slice(0, 5)));
  const inCoverage = evaluateCoverage(settings, normalized);
  const zone = await findSuggestedZone(store.id, normalized.city, normalized.postalCode, normalized.county);
  const verified = provider !== "manual" && inputMatches;

  let message = "Dirección validada y dentro de la cobertura.";
  if (!inputMatches) message = `La ciudad, región o código postal no coinciden. La ubicación encontrada es ${normalized.city}, ${normalized.regionCode} ${normalized.postalCode}.`;
  else if (!inCoverage) message = `Esta dirección está fuera de la cobertura configurada${settings.region_name ? ` (${settings.region_name})` : ""}.`;
  else if (!verified && settings.require_verified_address) message = "No pudimos verificar automáticamente esta dirección. Revísala o intenta con una dirección más completa.";

  return {
    valid: inputMatches && inCoverage && (verified || !settings.require_verified_address),
    verified,
    inCoverage,
    message,
    provider,
    ...normalized,
    suggestedZoneId: zone.id,
    suggestedZoneName: zone.name,
  };
}
