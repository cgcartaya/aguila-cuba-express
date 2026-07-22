import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validatePickupAddress } from "@/lib/pickups/address-validation";
import type { CreatePickupRequestInput } from "@/lib/pickups/types";

const MAX_TEXT = 500;

function clean(value: unknown, max = MAX_TEXT) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizePhone(value: unknown) {
  return clean(value, 30).replace(/[^0-9+]/g, "");
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

    const { data: store, error: storeError } = await supabaseAdmin
      .from("stores")
      .select("id, slug, is_active")
      .eq("slug", storeSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (storeError || !store) {
      return NextResponse.json({ error: "No pudimos identificar la tienda." }, { status: 404 });
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
        latitude: validation.latitude,
        longitude: validation.longitude,
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
      { id: pickup.id, request_code: pickup.request_code, address: validation },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("pickup request error", error);
    return NextResponse.json({ error: "Ocurrió un error procesando la solicitud." }, { status: 500 });
  }
}
