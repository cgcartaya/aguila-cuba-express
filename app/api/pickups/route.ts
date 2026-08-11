import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validatePickupAddress } from "@/lib/pickups/address-validation";
import type { CreatePickupRequestInput } from "@/lib/pickups/types";


// Vercel Pro: allow headroom for DB/storage/network work without applying a global timeout.
export const maxDuration = 60;
const MAX_TEXT = 500;

function clean(value: unknown, max = MAX_TEXT) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizePhone(value: unknown) {
  return clean(value, 30).replace(/[^0-9+]/g, "");
}


function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validCoordinate(value: unknown, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T12:00:00Z`))) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const candidate = new Date(`${value}T12:00:00`);
  return candidate >= today;
}

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "Se esperaba contenido JSON." }, { status: 415 });
    }

    const body = (await request.json()) as Partial<CreatePickupRequestInput>;
    const storeSlug = clean(body.store_slug, 100).toLowerCase();
    const customerName = clean(body.customer_name, 120);
    const phone = normalizePhone(body.phone);
    const preferredDates = Array.from(
      new Set((Array.isArray(body.preferred_dates) ? body.preferred_dates : []).map((value) => clean(value, 10)))
    ).filter(validDate).slice(0, 7);
    const requestedRouteId = clean(body.requested_route_id, 80);
    const requestedRouteName = clean(body.requested_route_name, 160);
    const requestedRouteDate = clean(body.requested_route_date, 10);

    if (!storeSlug || !customerName || phone.length < 7) {
      return NextResponse.json({ error: "Completa el nombre y un teléfono válido." }, { status: 400 });
    }

    if (preferredDates.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos una fecha futura." }, { status: 400 });
    }

    const validation = await validatePickupAddress({
      storeSlug,
      addressLine1: clean(body.address_line_1, 180),
      city: clean(body.city, 100),
      region: clean(body.region, 100),
      postalCode: clean(body.postal_code, 20),
      countryCode: clean(body.country_code || "US", 2).toUpperCase(),
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.message, address_validation: validation }, { status: 422 });
    }

    const requestedLatitude = validCoordinate(body.latitude, -90, 90);
    const requestedLongitude = validCoordinate(body.longitude, -180, 180);
    let finalLatitude = validation.latitude;
    let finalLongitude = validation.longitude;

    if (requestedLatitude != null && requestedLongitude != null) {
      const closeToValidatedAddress =
        validation.latitude == null ||
        validation.longitude == null ||
        distanceKm(validation.latitude, validation.longitude, requestedLatitude, requestedLongitude) <= 25;

      if (!closeToValidatedAddress) {
        return NextResponse.json(
          { error: "El punto seleccionado está demasiado lejos de la dirección validada. Revisa el marcador." },
          { status: 422 }
        );
      }

      finalLatitude = requestedLatitude;
      finalLongitude = requestedLongitude;
    }

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, slug, is_active")
      .eq("slug", storeSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json({ error: "No pudimos identificar la tienda." }, { status: 404 });
    }

    let verifiedRequestedRoute: { id: string; name: string; route_date: string } | null = null;
    if (requestedRouteId) {
      const { data: route } = await supabaseAdmin
        .from("pickup_routes")
        .select("id,name,route_date,status,is_public")
        .eq("id", requestedRouteId)
        .eq("store_id", store.id)
        .eq("is_public", true)
        // Solo se permite auto-agregarse a rutas "published"; una ruta "in_progress"
        // ya salio a recorrer, asi que esas solicitudes quedan pendientes normales
        // y el negocio coordina por WhatsApp si se puede sumar a la siguiente.
        .eq("status", "published")
        .maybeSingle();

      if (route) {
        verifiedRequestedRoute = { id: route.id, name: route.name, route_date: route.route_date };
        if (!preferredDates.includes(route.route_date) && validDate(route.route_date)) preferredDates.unshift(route.route_date);
      }
    }

    const { data: settings } = await supabaseAdmin
      .from("pickup_service_settings")
      .select("max_preferred_dates")
      .eq("store_id", store.id)
      .maybeSingle();

    const maxDates = Math.max(1, Math.min(7, Number(settings?.max_preferred_dates) || 3));
    const selectedDates = preferredDates.slice(0, maxDates);

    const { data: pickup, error: pickupError } = await supabaseAdmin
      .from("pickup_requests")
      .insert({
        store_id: store.id,
        customer_name: customerName,
        phone,
        email: clean(body.email, 160) || null,
        address_line_1: validation.addressLine1,
        address_line_2: clean(body.address_line_2, 100) || null,
        formatted_address: validation.formattedAddress,
        city: validation.city,
        region: validation.region,
        postal_code: validation.postalCode,
        country_code: validation.countryCode,
        county: validation.county,
        place_id: validation.placeId,
        latitude: finalLatitude,
        longitude: finalLongitude,
        address_verified: validation.verified,
        validation_provider: validation.provider,
        validation_payload: validation.raw || null,
        suggested_zone_id: validation.suggestedZoneId,
        assigned_zone_id: validation.suggestedZoneId,
        package_count: Math.max(1, Math.min(99, Number(body.package_count) || 1)),
        estimated_weight:
          body.estimated_weight == null || body.estimated_weight === ("" as any)
            ? null
            : Math.max(0, Math.min(10000, Number(body.estimated_weight) || 0)),
        package_type: clean(body.package_type, 80) || null,
        needs_box: Boolean(body.needs_box),
        needs_packing_help: Boolean(body.needs_packing_help),
        notes: clean(body.notes, 1000) || null,
        internal_notes: verifiedRequestedRoute
          ? `RUTA SOLICITADA: ${verifiedRequestedRoute.name} | ${verifiedRequestedRoute.route_date} | ROUTE_ID:${verifiedRequestedRoute.id}`
          : requestedRouteName && requestedRouteDate
            ? `RUTA SOLICITADA (pendiente de verificar): ${requestedRouteName} | ${requestedRouteDate}`
            : null,
        status: "new",
      })
      .select("id, request_code")
      .single();

    if (pickupError || !pickup) {
      console.error("pickup insert error", pickupError);
      return NextResponse.json({ error: "No pudimos registrar la solicitud." }, { status: 500 });
    }

    const dateRows = selectedDates.map((preferredDate, index) => ({
      pickup_request_id: pickup.id,
      preferred_date: preferredDate,
      priority: index + 1,
    }));

    const { error: datesError } = await supabaseAdmin.from("pickup_request_dates").insert(dateRows);
    if (datesError) {
      await supabaseAdmin.from("pickup_requests").delete().eq("id", pickup.id);
      return NextResponse.json({ error: "No pudimos guardar las fechas seleccionadas." }, { status: 500 });
    }

    return NextResponse.json(
      { id: pickup.id, request_code: pickup.request_code, address: validation, requested_route: verifiedRequestedRoute },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("pickup request error", error);
    return NextResponse.json({ error: "Ocurrió un error procesando la solicitud." }, { status: 500 });
  }
}
