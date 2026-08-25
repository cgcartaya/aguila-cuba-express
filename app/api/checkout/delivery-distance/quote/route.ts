import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  calculateDistanceDeliveryFee,
  getDrivingRoute,
  normalizeDistanceSettings,
  validCoordinate,
} from "@/lib/checkout/distance-delivery";

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storeId = String(body.storeId || "").trim();
    const latitude = validCoordinate(body.latitude, -90, 90);
    const longitude = validCoordinate(body.longitude, -180, 180);
    if (!storeId || latitude == null || longitude == null) {
      return NextResponse.json({ error: "Selecciona una ubicación válida." }, { status: 400 });
    }

    const { data: row } = await supabaseAdmin
      .from("checkout_settings")
      .select("delivery_address_mode,delivery_origin_address,delivery_origin_latitude,delivery_origin_longitude,distance_base_km,distance_base_fee,distance_additional_fee_per_km,max_delivery_distance_km")
      .eq("store_id", storeId)
      .maybeSingle();
    if (!row || row.delivery_address_mode !== "distance") {
      return NextResponse.json({ error: "Esta tienda no tiene habilitado el cálculo por distancia." }, { status: 409 });
    }

    const settings = normalizeDistanceSettings(row);
    if (settings.delivery_origin_latitude == null || settings.delivery_origin_longitude == null) {
      return NextResponse.json({ error: "La tienda todavía no configuró su punto de salida." }, { status: 409 });
    }

    const route = await getDrivingRoute(
      { latitude: settings.delivery_origin_latitude, longitude: settings.delivery_origin_longitude },
      { latitude, longitude }
    );
    const distanceKm = route.distanceMeters / 1000;
    if (settings.max_delivery_distance_km && distanceKm > settings.max_delivery_distance_km) {
      return NextResponse.json(
        { error: `La ubicación está a ${distanceKm.toFixed(2)} km y supera el máximo de ${settings.max_delivery_distance_km.toFixed(2)} km.` },
        { status: 422 }
      );
    }

    return NextResponse.json({
      distanceMeters: Math.round(route.distanceMeters),
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationSeconds: route.durationSeconds,
      fee: calculateDistanceDeliveryFee(route.distanceMeters, settings),
      provider: route.provider,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("delivery distance quote error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No pudimos calcular el domicilio." }, { status: 502 });
  }
}
