import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreBySlug } from "@/lib/services/stores";

export async function GET(request: NextRequest) {
  try {
    const slug = (new URL(request.url).searchParams.get("slug") || "")
      .trim()
      .toLowerCase();

    if (!slug) return NextResponse.json({ zones: [] });

    const store = await getStoreBySlug(slug);

    if (!store || !store.module_menu_enabled) {
      return NextResponse.json({ zones: [] });
    }

    // IMPORTANTE:
    // Restaurante y tienda comparten ahora la MISMA tabla delivery_zones.
    const { data, error } = await supabaseAdmin
      .from("delivery_zones")
      .select(
        "id, municipality, zone_name, delivery_fee, minimum_order, free_delivery_from, sort_order"
      )
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("municipality", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("zone_name", { ascending: true });

    if (error) {
      console.error("GET menu delivery zones:", error.message);
      return NextResponse.json({ zones: [] });
    }

    // Conservamos el shape que MenuCartDrawer ya espera.
    const zones = (data || []).map((zone) => ({
      id: zone.id,
      municipality: zone.municipality,
      zone_name: zone.zone_name,
      name: `${zone.municipality} · ${zone.zone_name}`,
      fee: Number(zone.delivery_fee || 0),
      delivery_fee: Number(zone.delivery_fee || 0),
      minimum_order: Number(zone.minimum_order || 0),
      free_delivery_from: Number(zone.free_delivery_from || 0),
      estimated_minutes_min: null,
      estimated_minutes_max: null,
    }));

    return NextResponse.json({ zones });
  } catch (error) {
    console.error("GET /api/public/menu-delivery-zones error:", error);
    return NextResponse.json({ zones: [] });
  }
}
