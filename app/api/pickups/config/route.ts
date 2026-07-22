import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCityOptions } from "@/lib/geo/location-catalog";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean) : [];
}

export async function GET(request: NextRequest) {
  try {
    const storeSlug = String(request.nextUrl.searchParams.get("store_slug") || "").trim().toLowerCase();
    if (!storeSlug) return NextResponse.json({ error: "Falta la tienda." }, { status: 400 });

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id, slug")
      .eq("slug", storeSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (!store) return NextResponse.json({ error: "Tienda no encontrada." }, { status: 404 });

    const { data: settings } = await supabaseAdmin
      .from("pickup_service_settings")
      .select("country_code,country_name,region_code,region_name,coverage_mode,allowed_cities,max_preferred_dates,is_enabled")
      .eq("store_id", store.id)
      .maybeSingle();
    if (!settings?.is_enabled) return NextResponse.json({ error: "Recogidas no disponibles." }, { status: 404 });

    const allRegionCities = getCityOptions(settings.country_code, settings.region_code || "").map((item) => item.label);
    const selected = asStringArray(settings.allowed_cities);
    const cities = settings.coverage_mode === "cities" ? selected : allRegionCities;

    return NextResponse.json({
      countryCode: settings.country_code,
      countryName: settings.country_name,
      regionCode: settings.region_code,
      regionName: settings.region_name,
      coverageMode: settings.coverage_mode,
      maxPreferredDates: settings.max_preferred_dates || 3,
      cities,
    }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=1800" } });
  } catch (error) {
    console.error("pickup config error", error);
    return NextResponse.json({ error: "No pudimos cargar la cobertura." }, { status: 500 });
  }
}
