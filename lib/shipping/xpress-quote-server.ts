import { supabaseAdmin as db } from "@/lib/supabase-admin";
import type { XpressRate } from "./xpress-quote";

export async function getXpressQuoteRates(storeId: string): Promise<XpressRate[]> {
  const [countries, services, rates] = await Promise.all([
    db.from("shipping_countries").select("id").eq("store_id", storeId).ilike("code", "cu").eq("is_active", true),
    db.from("shipping_service_types").select("id,name,code,billing_mode").eq("store_id", storeId)
      .like("code", "xpress-%").eq("is_active", true).order("sort_order"),
    db.from("shipping_rates").select("service_type_id,country_id,transport_mode,rate_per_lb,fixed_fee,minimum_charge,minimum_weight_lb,maximum_weight_lb,weight_threshold_lb,rate_at_or_above_threshold")
      .eq("store_id", storeId).eq("scope_type", "country").eq("is_active", true)
      .order("priority", { ascending: false }).order("id"),
  ]);
  if (countries.error || services.error || rates.error) return [];

  const countryIds = new Set(countries.data.map(({ id }) => id));
  return services.data.flatMap((service) => {
    const price = rates.data.find((rate) => rate.service_type_id === service.id && countryIds.has(rate.country_id ?? ""));
    if (!price || !["fixed", "per_lb"].includes(service.billing_mode)) return [];
    return [{
      id: service.id, label: service.name,
      mode: service.code.startsWith("xpress-caja-") ? "cajas" : price.transport_mode,
      fixed: service.billing_mode === "fixed", rate: Number(price.rate_per_lb), fee: Number(price.fixed_fee),
      minimum: Number(price.minimum_charge), minWeight: Number(price.minimum_weight_lb),
      maxWeight: price.maximum_weight_lb == null ? null : Number(price.maximum_weight_lb),
      threshold: price.weight_threshold_lb == null ? null : Number(price.weight_threshold_lb),
      thresholdRate: price.rate_at_or_above_threshold == null ? null : Number(price.rate_at_or_above_threshold),
    }];
  });
}
