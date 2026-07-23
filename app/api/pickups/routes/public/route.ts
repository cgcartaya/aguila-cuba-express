import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("store")?.trim();
  if (!slug) return NextResponse.json({ routes: [] }, { status: 400 });

  const { data: store } = await supabaseAdmin.from("stores").select("id").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!store) return NextResponse.json({ routes: [] }, { status: 404 });

  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabaseAdmin
    .from("pickup_routes")
    .select(`id,name,route_date,public_summary,color,pickup_route_stops(stop_order,pickup_requests(city))`)
    .eq("store_id", store.id)
    .eq("is_public", true)
    .eq("status", "published")
    .gte("route_date", today)
    .order("route_date", { ascending: true })
    .limit(4);

  if (error) return NextResponse.json({ routes: [] }, { status: 500 });

  const routes = (data || []).map((route: any) => {
    const cities = Array.from(new Set((route.pickup_route_stops || []).sort((a: any, b: any) => a.stop_order - b.stop_order).map((stop: any) => stop.pickup_requests?.city).filter(Boolean)));
    return { id: route.id, name: route.name, route_date: route.route_date, public_summary: route.public_summary, color: route.color, cities };
  });

  return NextResponse.json({ routes }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
