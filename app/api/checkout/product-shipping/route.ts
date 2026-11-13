import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { isCartShippingEnabled, quoteCartShipping } from "@/lib/shipping/cart-shipping";
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("storeId") || "";
  const { data: store } = await db
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("is_active", true)
    .eq("module_shipping_enabled", true)
    .maybeSingle();
  if (!store || !(await isCartShippingEnabled(storeId))) {
    return NextResponse.json({ options: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const [r, s, c, p, m, l] = await Promise.all([
    db
      .from("shipping_rates")
      .select(
        "id,service_type_id,scope_type,country_id,province_id,municipality_id,location_id,transport_mode,rate_per_lb,minimum_weight_lb,minimum_charge,fixed_fee,maximum_weight_lb",
      )
      .eq("store_id", storeId)
      .eq("is_active", true)
      .order("priority", { ascending: false }),
    db
      .from("shipping_service_types")
      .select("id,name")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .eq("billing_mode", "per_lb"),
    db
      .from("shipping_countries")
      .select("id,name")
      .eq("store_id", storeId)
      .eq("is_active", true),
    db
      .from("shipping_provinces")
      .select("id,name,country_id")
      .eq("store_id", storeId)
      .eq("is_active", true),
    db
      .from("shipping_municipalities")
      .select("id,name,province_id")
      .eq("store_id", storeId)
      .eq("is_active", true),
    db
      .from("shipping_locations")
      .select("id,name,municipality_id")
      .eq("store_id", storeId)
      .eq("is_active", true),
  ]);
  if ([r, s, c, p, m, l].some((x) => x.error))
    return NextResponse.json(
      { error: "No se pudieron cargar las modalidades de envío." },
      { status: 500 },
    );
  const options = (r.data || []).flatMap((rate) => {
    const service = s.data?.find((x) => x.id === rate.service_type_id);
    const location = l.data?.find((x) => x.id === rate.location_id);
    const municipality = m.data?.find(
      (x) => x.id === (rate.municipality_id || location?.municipality_id),
    );
    const province = p.data?.find(
      (x) => x.id === (rate.province_id || municipality?.province_id),
    );
    const country = c.data?.find(
      (x) => x.id === (rate.country_id || province?.country_id),
    );
    const destination = [
      country?.name,
      province?.name,
      municipality?.name,
      location?.name,
    ]
      .filter(Boolean)
      .join(" / ");
    return service && destination
      ? [
          {
            id: rate.id,
            service: service.name,
            mode: rate.transport_mode,
            destination,
            rate_per_lb: rate.rate_per_lb,
            minimum_weight_lb: rate.minimum_weight_lb,
            minimum_charge: rate.minimum_charge,
            fixed_fee: rate.fixed_fee,
          },
        ]
      : [];
  });
  return NextResponse.json(
    { options },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (
      !Array.isArray(body.items) ||
      typeof body.storeId !== "string" ||
      typeof body.selection?.rate_id !== "string"
    )
      throw new Error("Completa los datos del envío.");
    return NextResponse.json(
      await quoteCartShipping(body.storeId, body.items, body.selection),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo calcular el envío.",
      },
      { status: 422 },
    );
  }
}
