import "server-only";

import { supabaseAdmin as db } from "@/lib/supabase-admin";
import type { XpressDestination, XpressRate } from "./xpress-quote";

export async function getXpressQuoteRates(storeId: string): Promise<XpressRate[]> {
  const [countries, services, rates, provinces, municipalities] = await Promise.all([
    db.from("shipping_countries").select("id").eq("store_id", storeId).ilike("code", "cu").eq("is_active", true),
    db.from("shipping_service_types").select("id,name,code,billing_mode").eq("store_id", storeId)
      .like("code", "xpress-%").eq("is_active", true).order("sort_order"),
    db.from("shipping_rates")
      .select("id,service_type_id,scope_type,country_id,province_id,municipality_id,transport_mode,rate_per_lb,fixed_fee,minimum_charge,minimum_weight_lb,maximum_weight_lb,weight_threshold_lb,rate_at_or_above_threshold")
      .eq("store_id", storeId).in("scope_type", ["country", "province", "municipality"]).eq("is_active", true)
      .order("priority", { ascending: false }).order("id"),
    db.from("shipping_provinces").select("id,name,country_id").eq("store_id", storeId).eq("is_active", true),
    db.from("shipping_municipalities").select("id,name,province_id").eq("store_id", storeId).eq("is_active", true),
  ]);
  if (countries.error || services.error || rates.error || provinces.error || municipalities.error) return [];

  const countryIds = new Set(countries.data.map(({ id }) => id));
  const provinceById = new Map(provinces.data.filter((p) => countryIds.has(p.country_id)).map((p) => [p.id, p]));
  const municipalityById = new Map(municipalities.data.map((m) => [m.id, m]));
  // Fixed-price services keep their transport price and use the delivery table
  // for their modality, since there are no scoped rates for those services.
  const fixedDeliveryServices = new Map(services.data.map(({ code, id }) => [code, id]));

  return services.data.flatMap((service) => {
    const base = rates.data.find((rate) => rate.service_type_id === service.id &&
      rate.scope_type === "country" && countryIds.has(rate.country_id ?? ""));
    if (!base || !["fixed", "per_lb"].includes(service.billing_mode)) return [];
    const fixed = service.billing_mode === "fixed";
    const express = base.transport_mode === "express";
    const scope = express ? "municipality" : "province";
    const deliveryService = fixed
      ? fixedDeliveryServices.get(express ? "xpress-miscelaneas" : "xpress-basicos")
      : service.id;
    const destinations = rates.data.flatMap((rate): XpressDestination[] => {
      if (rate.service_type_id !== deliveryService || rate.scope_type !== scope || rate.transport_mode !== base.transport_mode) {
        return [];
      }
      const municipality = express ? municipalityById.get(rate.municipality_id ?? "") : undefined;
      if (express && !municipality) return [];
      const province = provinceById.get(municipality?.province_id ?? rate.province_id ?? "");
      if (!province) return [];
      const {
        rate_per_lb, fixed_fee, minimum_charge, minimum_weight_lb,
        maximum_weight_lb, weight_threshold_lb, rate_at_or_above_threshold,
      } = rate;
      return [{
        id: rate.id,
        province: province.name,
        municipality: municipality?.name,
        pricing: {
          rate_per_lb, fixed_fee, minimum_charge, minimum_weight_lb,
          maximum_weight_lb, weight_threshold_lb, rate_at_or_above_threshold,
        },
      }];
    }).sort((a, b) => a.province.localeCompare(b.province, "es") ||
      (a.municipality ?? "").localeCompare(b.municipality ?? "", "es"));

    return [{
      id: service.id,
      label: service.name,
      mode: service.code.startsWith("xpress-caja-") ? "cajas" : base.transport_mode,
      unitPrice: fixed ? Number(base.fixed_fee) : null,
      destinations,
    }];
  });
}
