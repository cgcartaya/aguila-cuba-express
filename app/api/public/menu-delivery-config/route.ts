import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const slug = String(request.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: "Falta la tienda." }, { status: 400 });

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("slug", slug)
    .eq("module_menu_enabled", true)
    .maybeSingle();
  if (!store) return NextResponse.json({ error: "Menú no disponible." }, { status: 404 });

  const { data: settings } = await supabaseAdmin
    .from("checkout_settings")
    .select("delivery_address_mode,delivery_origin_latitude,delivery_origin_longitude")
    .eq("store_id", store.id)
    .maybeSingle();

  const distanceEnabled = settings?.delivery_address_mode === "distance" &&
    settings.delivery_origin_latitude != null && settings.delivery_origin_longitude != null;

  return NextResponse.json({
    mode: distanceEnabled ? "distance" : "zones",
    origin: distanceEnabled ? {
      latitude: Number(settings.delivery_origin_latitude),
      longitude: Number(settings.delivery_origin_longitude),
    } : null,
  }, { headers: { "Cache-Control": "no-store" } });
}
