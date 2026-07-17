import { supabase } from "@/lib/supabase";
import type {
  ShippingCountry,
  ShippingExtraFee,
  ShippingLocation,
  ShippingMunicipality,
  ShippingProvince,
  ShippingRate,
  ShippingServiceType,
  ShippingSettings,
} from "@/lib/shipping/types";

export async function getShippingConfiguration(storeId: string) {
  const [
    settings,
    countries,
    provinces,
    municipalities,
    locations,
    serviceTypes,
    rates,
    extraFees,
  ] = await Promise.all([
    supabase
      .from("shipping_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle<ShippingSettings>(),

    supabase
      .from("shipping_countries")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order")
      .returns<ShippingCountry[]>(),

    supabase
      .from("shipping_provinces")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order")
      .returns<ShippingProvince[]>(),

    supabase
      .from("shipping_municipalities")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order")
      .returns<ShippingMunicipality[]>(),

    supabase
      .from("shipping_locations")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order")
      .returns<ShippingLocation[]>(),

    supabase
      .from("shipping_service_types")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order")
      .returns<ShippingServiceType[]>(),

    supabase
      .from("shipping_rates")
      .select("*")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .returns<ShippingRate[]>(),

    supabase
      .from("shipping_extra_fees")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order")
      .returns<ShippingExtraFee[]>(),
  ]);

  return {
    settings: settings.data || null,
    countries: countries.data || [],
    provinces: provinces.data || [],
    municipalities: municipalities.data || [],
    locations: locations.data || [],
    serviceTypes: serviceTypes.data || [],
    rates: rates.data || [],
    extraFees: extraFees.data || [],
    error:
      settings.error ||
      countries.error ||
      provinces.error ||
      municipalities.error ||
      locations.error ||
      serviceTypes.error ||
      rates.error ||
      extraFees.error ||
      null,
  };
}

export async function upsertShippingSettings(
  storeId: string,
  input: Partial<ShippingSettings>
) {
  return supabase
    .from("shipping_settings")
    .upsert(
      {
        store_id: storeId,
        default_country_id: input.default_country_id || null,
        default_province_id: input.default_province_id || null,
        currency: input.currency || "USD",
        phone_digits_min: input.phone_digits_min ?? 8,
        phone_digits_max: input.phone_digits_max ?? 15,
        default_rate_per_lb: input.default_rate_per_lb ?? 0,
        money_threshold: input.money_threshold ?? 1000,
        money_rate_below_threshold: input.money_rate_below_threshold ?? 8,
        money_rate_at_or_above_threshold: input.money_rate_at_or_above_threshold ?? 5,
        allow_manual_discount: input.allow_manual_discount ?? true,
        maximum_manual_discount: input.maximum_manual_discount ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" }
    )
    .select("*")
    .single<ShippingSettings>();
}

export async function createCountry(
  storeId: string,
  name: string,
  code: string
) {
  return supabase.from("shipping_countries").insert({
    store_id: storeId,
    name: name.trim(),
    code: code.trim().toUpperCase(),
  });
}

export async function createProvince(
  storeId: string,
  countryId: string,
  name: string,
  code: string
) {
  return supabase.from("shipping_provinces").insert({
    store_id: storeId,
    country_id: countryId,
    name: name.trim(),
    code: code.trim(),
  });
}

export async function createMunicipality(
  storeId: string,
  provinceId: string,
  name: string,
  code: string
) {
  return supabase.from("shipping_municipalities").insert({
    store_id: storeId,
    province_id: provinceId,
    name: name.trim(),
    code: code.trim(),
  });
}

export async function createLocation(
  storeId: string,
  municipalityId: string,
  name: string,
  legacyCode: string
) {
  return supabase.from("shipping_locations").insert({
    store_id: storeId,
    municipality_id: municipalityId,
    name: name.trim(),
    legacy_code: legacyCode.trim(),
  });
}

export async function createServiceType(
  storeId: string,
  name: string,
  code: string,
  legacyPrefix: string,
  billingMode: "per_lb" | "fixed" | "percentage"
) {
  return supabase.from("shipping_service_types").insert({
    store_id: storeId,
    name: name.trim(),
    code: code.trim(),
    legacy_prefix: legacyPrefix.trim(),
    billing_mode: billingMode,
  });
}

export async function upsertShippingRate(input: {
  store_id: string;
  location_id: string;
  service_type_id: string;
  rate_per_lb: number;
  minimum_weight_lb: number;
  minimum_charge: number;
}) {
  return supabase
    .from("shipping_rates")
    .upsert(input, {
      onConflict: "store_id,location_id,service_type_id",
    });
}

export async function createExtraFee(input: {
  store_id: string;
  name: string;
  code: string;
  amount: number;
  calculation_type: "fixed" | "per_lb" | "percentage";
}) {
  return supabase.from("shipping_extra_fees").insert(input);
}


export async function updateExtraFee(
  id: string,
  input: {
    store_id: string;
    name: string;
    code: string;
    amount: number;
    calculation_type: "fixed" | "per_lb" | "percentage";
  }
) {
  return supabase
    .from("shipping_extra_fees")
    .update({
      name: input.name.trim(),
      code: input.code.trim(),
      amount: input.amount,
      calculation_type: input.calculation_type,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("store_id", input.store_id)
    .select("*")
    .single();
}

export async function toggleShippingConfigItem(
  table:
    | "shipping_countries"
    | "shipping_provinces"
    | "shipping_municipalities"
    | "shipping_locations"
    | "shipping_service_types"
    | "shipping_extra_fees",
  id: string,
  isActive: boolean
) {
  return supabase.from(table).update({ is_active: isActive }).eq("id", id);
}


export type ShippingConfigTable =
  | "shipping_countries"
  | "shipping_provinces"
  | "shipping_municipalities"
  | "shipping_locations"
  | "shipping_service_types"
  | "shipping_extra_fees";

export async function setShippingConfigItemActive(
  table: ShippingConfigTable,
  id: string,
  isActive: boolean
) {
  return supabase
    .from(table)
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
}

export async function deleteShippingConfigItem(
  table: ShippingConfigTable,
  id: string
) {
  return supabase.from(table).delete().eq("id", id);
}


export async function upsertShippingRatesBulk(input: {
  store_id: string;
  location_ids: string[];
  service_type_ids: string[];
  rate_per_lb: number;
  minimum_weight_lb: number;
  minimum_charge: number;
}) {
  const locationIds = Array.from(new Set(input.location_ids.filter(Boolean)));
  const serviceTypeIds = Array.from(
    new Set(input.service_type_ids.filter(Boolean))
  );

  if (!locationIds.length) {
    throw new Error("Selecciona al menos un destino.");
  }

  if (!serviceTypeIds.length) {
    throw new Error("Selecciona al menos un tipo de paquete.");
  }

  if (input.rate_per_lb < 0) {
    throw new Error("La tarifa por libra no puede ser negativa.");
  }

  const rows = locationIds.flatMap((locationId) =>
    serviceTypeIds.map((serviceTypeId) => ({
      store_id: input.store_id,
      location_id: locationId,
      service_type_id: serviceTypeId,
      rate_per_lb: input.rate_per_lb,
      minimum_weight_lb: input.minimum_weight_lb,
      minimum_charge: input.minimum_charge,
      is_active: true,
      updated_at: new Date().toISOString(),
    }))
  );

  return supabase
    .from("shipping_rates")
    .upsert(rows, {
      onConflict: "store_id,location_id,service_type_id",
    })
    .select("*");
}

export type BulkShippingStatus =
  | "in_transit"
  | "received_cuba"
  | "out_for_delivery";

export async function updateActiveShipmentsStatusBulk(
  storeId: string,
  status: BulkShippingStatus
) {
  const mutableStatuses = [
    "received_miami",
    "preparing",
    "in_transit",
    "received_cuba",
    "out_for_delivery",
  ];

  return supabase
    .from("shipments")
    .update({
      status,
      delivered: false,
      delivered_date: null,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .eq("delivered", false)
    .in("status", mutableStatuses)
    .select("id,tracking_code,status");
}
