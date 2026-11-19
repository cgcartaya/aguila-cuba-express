import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCityOptions } from "@/lib/geo/location-catalog";
import { cityKey, localDate, validateItinerary, type ItineraryGroup } from "@/lib/pickups/itinerary";

import { LUXURY_PICKUP_STORE_SLUG, splitPickupArea } from "@/lib/pickups/luxury-coverage";
import { luxuryZipPoints } from "@/lib/pickups/luxury-zip-points";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("store")?.trim();
  if (!slug) return NextResponse.json({ routes: [], coverageCities: [] }, { status: 400 });
  const { data: store } = await supabaseAdmin.from("stores").select("id,module_pickups_enabled").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!store?.module_pickups_enabled) return NextResponse.json({ routes: [], coverageCities: [] }, { status: 404 });
  const { data: settings } = await supabaseAdmin.from("pickup_service_settings").select("timezone,country_code,region_code").eq("store_id", store.id).maybeSingle();
  const today = localDate(settings?.timezone || "America/New_York");
  const luxury = slug === LUXURY_PICKUP_STORE_SLUG;
  const [{ data, error }, { data: zoneRows }] = await Promise.all([
    supabaseAdmin.from("pickup_routes")
      .select(`id,name,route_date,status,public_summary,color,public_itinerary,public_itinerary_managed,poster_image_url,public_checkpoint,pickup_route_stops(stop_order,pickup_requests(city))`)
      .eq("store_id", store.id).eq("is_public", true).in("status", ["published", "in_progress"])
      .gte("route_date", today).order("status", { ascending: true }).order("route_date", { ascending: true }).limit(4),
    supabaseAdmin.from("pickup_zone_cities").select("city_name,pickup_zones(name,color,is_active)").eq("store_id", store.id),
  ]);
  if (error) return NextResponse.json({ routes: [], coverageCities: [], error: "No se pudieron cargar las rutas." }, { status: 500 });
  // Public coordinates are city centres from the catalog, NEVER customer coordinates.
  const catalog = new Map(getCityOptions(settings?.country_code || "US", settings?.region_code || "SC").map((city) => [cityKey(city.label), city]));
  const publicCity = (name: string, order: number, start?: string | null, end?: string | null) => {
    const area = luxury ? splitPickupArea(name) : { city: name, zip: null };
    const city = catalog.get(cityKey(area.city));
    const point = area.zip ? luxuryZipPoints[area.zip] : undefined;
    return { name, order, latitude: point?.[0] ?? (city?.latitude ? Number(city.latitude) : null), longitude: point?.[1] ?? (city?.longitude ? Number(city.longitude) : null), start_time: start || null, end_time: end || null };
  };
  const routes = (data || []).map((route) => {
    let groups: ItineraryGroup[] = [];
    try { groups = validateItinerary(route.public_itinerary); } catch { /* Legacy routes use customer city names only. */ }
    let cities;
    if (route.public_itinerary_managed || groups?.length) {
      cities = groups.flatMap((group) => group.cities.map((name) => ({ name, start: group.start_time, end: group.end_time }))).map((city, index) => publicCity(city.name, index + 1, city.start, city.end));
    } else {
      const names = (route.pickup_route_stops || []).sort((a, b) => a.stop_order - b.stop_order)
        .map((stop) => (stop.pickup_requests as unknown as { city: string } | null)?.city?.trim()).filter((city): city is string => Boolean(city));
      cities = Array.from(new Set(names)).map((name, index) => publicCity(name, index + 1));
    }
    const checkpoint = route.public_checkpoint as import("@/lib/pickups/luxury-coverage").RouteCheckpoint | null;
    const publishedCheckpoint = luxury && route.status === "in_progress" && checkpoint &&
      cities.some((city) => city.name === checkpoint.area)
      ? { area: checkpoint.area, phase: checkpoint.phase, updated_at: checkpoint.updated_at }
      : null;
    return { ...(luxury ? { checkpoint: publishedCheckpoint } : {}), id: route.id, name: route.name, route_date: route.route_date, status: route.status, public_summary: route.public_summary, color: route.color, poster_image_url: route.poster_image_url, cities };
  });
  const coverageCities = (zoneRows || []).filter((row) => (row.pickup_zones as unknown as { is_active: boolean } | null)?.is_active !== false)
    .map((row) => {
      const zone = row.pickup_zones as unknown as { name: string; color: string } | null;
      return { ...publicCity(row.city_name.trim(), 0), zoneName: zone?.name || null, zoneColor: zone?.color || null };
    }).sort((a, b) => a.name.localeCompare(b.name, "es"));
  return NextResponse.json({ routes, coverageCities, timezone: settings?.timezone || "America/New_York" }, { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=15" } });
}
