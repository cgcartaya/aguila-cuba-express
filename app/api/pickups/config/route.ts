import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCityOptions } from "@/lib/geo/location-catalog";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

const getCachedPickupConfig = unstable_cache(
  async (storeSlug: string) => {
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id, slug")
      .eq("slug", storeSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (!store) return { status: 404, body: { error: "Tienda no encontrada." } };

    const { data: settings } = await supabaseAdmin
      .from("pickup_service_settings")
      .select("country_code,country_name,region_code,region_name,coverage_mode,allowed_cities,max_preferred_dates,is_enabled")
      .eq("store_id", store.id)
      .maybeSingle();
    if (!settings?.is_enabled) return { status: 404, body: { error: "Recogidas no disponibles." } };

    const allRegionCities = getCityOptions(settings.country_code, settings.region_code || "").map((item) => item.label);
    const selected = asStringArray(settings.allowed_cities);
    const cities = settings.coverage_mode === "cities" ? selected : allRegionCities;

    return {
      status: 200,
      body: {
        countryCode: settings.country_code,
        countryName: settings.country_name,
        regionCode: settings.region_code,
        regionName: settings.region_name,
        coverageMode: settings.coverage_mode,
        maxPreferredDates: settings.max_preferred_dates || 3,
        cities,
      },
    };
  },
  ["pickup-config-v2"],
  { revalidate: 300, tags: ["pickup-config"] },
);

export async function GET(request: NextRequest) {
  try {
    const storeSlug = String(request.nextUrl.searchParams.get("store_slug") || "").trim().toLowerCase();
    if (!storeSlug) return NextResponse.json({ error: "Falta la tienda." }, { status: 400 });

    const result = await getCachedPickupConfig(storeSlug);
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("pickup config error", error);
    return NextResponse.json({ error: "No pudimos cargar la cobertura." }, { status: 500 });
  }
}
