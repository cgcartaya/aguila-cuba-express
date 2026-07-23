import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("store")?.trim();
  if (!slug) return NextResponse.json({ routes: [], coverageCities: [] }, { status: 400 });

  const { data: store } = await supabaseAdmin.from("stores").select("id").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!store) return NextResponse.json({ routes: [], coverageCities: [] }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  const [{ data, error }, { data: zoneRows }] = await Promise.all([
    supabaseAdmin
      .from("pickup_routes")
      .select(`id,name,route_date,status,public_summary,color,pickup_route_stops(stop_order,pickup_requests(city,latitude,longitude))`)
      .eq("store_id", store.id)
      .eq("is_public", true)
      .in("status", ["published", "in_progress"])
      .gte("route_date", today)
      .order("route_date", { ascending: true })
      .limit(4),
    supabaseAdmin
      .from("pickup_zone_cities")
      .select("city_name,latitude,longitude,pickup_zones(name,color,is_active)")
      .eq("store_id", store.id),
  ]);

  if (error) return NextResponse.json({ routes: [], coverageCities: [] }, { status: 500 });

  const routes = (data || []).map((route: any) => {
    const seen = new Set<string>();
    const cities = (route.pickup_route_stops || [])
      .sort((a: any, b: any) => a.stop_order - b.stop_order)
      .map((stop: any) => ({
        name: String(stop.pickup_requests?.city || "").trim(),
        latitude: stop.pickup_requests?.latitude == null ? null : Number(stop.pickup_requests.latitude),
        longitude: stop.pickup_requests?.longitude == null ? null : Number(stop.pickup_requests.longitude),
        order: Number(stop.stop_order || 0),
      }))
      .filter((city: any) => {
        const key = city.name.toLocaleLowerCase("es");
        if (!city.name || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return { id: route.id, name: route.name, route_date: route.route_date, status: route.status, public_summary: route.public_summary, color: route.color, cities };
  }).sort((a: any, b: any) => (a.status === "in_progress" ? -1 : b.status === "in_progress" ? 1 : a.route_date.localeCompare(b.route_date)));

  const coverageCities = (zoneRows || [])
    .filter((row: any) => row.pickup_zones?.is_active !== false)
    .map((row: any) => ({
      name: String(row.city_name || "").trim(),
      latitude: row.latitude == null ? null : Number(row.latitude),
      longitude: row.longitude == null ? null : Number(row.longitude),
      zoneName: row.pickup_zones?.name || null,
      zoneColor: row.pickup_zones?.color || null,
    }))
    .filter((city: any) => city.name)
    .sort((a: any, b: any) => a.name.localeCompare(b.name, "es"));

  return NextResponse.json({ routes, coverageCities }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
