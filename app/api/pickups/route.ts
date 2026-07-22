import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { CreatePickupRequestInput } from "@/lib/pickups/types";

const MAX_TEXT = 500;
const SC_STATE_NAMES = new Set(["SC", "SOUTH CAROLINA", "CAROLINA DEL SUR"]);

function clean(value: unknown, max = MAX_TEXT) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizePhone(value: unknown) {
  return clean(value, 30).replace(/[^0-9+]/g, "");
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
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
    const address = clean(body.address_line_1, 180);
    const city = clean(body.city, 100);
    const region = clean(body.region, 100);
    const postalCode = clean(body.postal_code, 20);
    const preferredDates = Array.from(
      new Set((Array.isArray(body.preferred_dates) ? body.preferred_dates : []).map((v) => clean(v, 10)))
    ).filter(validDate).slice(0, 3);

    if (!storeSlug || !customerName || phone.length < 7 || !address || !city || !region || !postalCode) {
      return NextResponse.json({ error: "Completa nombre, teléfono y dirección de recogida." }, { status: 400 });
    }

    if (preferredDates.length === 0) {
      return NextResponse.json({ error: "Selecciona al menos una fecha preferida." }, { status: 400 });
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

    // Restricción inicial para Yoyo. Las demás tiendas pueden configurar otras regiones.
    if (storeSlug === "yoyo-envios" && !SC_STATE_NAMES.has(region.toUpperCase())) {
      return NextResponse.json({ error: "YOYO Envíos realiza recogidas dentro de Carolina del Sur." }, { status: 400 });
    }

    const { data: pickup, error: pickupError } = await supabaseAdmin
      .from("pickup_requests")
      .insert({
        store_id: store.id,
        customer_name: customerName,
        phone,
        email: clean(body.email, 160) || null,
        address_line_1: address,
        address_line_2: clean(body.address_line_2, 100) || null,
        city,
        region,
        postal_code: postalCode,
        country_code: clean(body.country_code, 2).toUpperCase() || "US",
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

    const dateRows = preferredDates.map((preferredDate, index) => ({
      pickup_request_id: pickup.id,
      preferred_date: preferredDate,
      priority: index + 1,
    }));

    const { error: datesError } = await supabaseAdmin
      .from("pickup_request_dates")
      .insert(dateRows);

    if (datesError) {
      await supabaseAdmin.from("pickup_requests").delete().eq("id", pickup.id);
      console.error("pickup dates insert error", datesError);
      return NextResponse.json({ error: "No pudimos guardar las fechas seleccionadas." }, { status: 500 });
    }

    return NextResponse.json(
      { id: pickup.id, request_code: pickup.request_code },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("pickup request error", error);
    return NextResponse.json({ error: "Ocurrió un error procesando la solicitud." }, { status: 500 });
  }
}
