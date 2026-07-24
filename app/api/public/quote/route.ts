import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PLATFORM_DOMAIN = "perlamarketplace.com";
const SCOPE_SCORE: Record<string, number> = { country: 1, province: 2, municipality: 3, location: 4 };

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getStoreKey(request: NextRequest) {
  const host = (request.headers.get("host") || "")
    .split(":")[0]
    .replace(/^www\./, "")
    .toLowerCase()
    .trim();

  return host.endsWith(`.${PLATFORM_DOMAIN}`)
    ? { type: "subdomain" as const, value: host.slice(0, -(`.${PLATFORM_DOMAIN}`.length)) }
    : { type: "domain" as const, value: host };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const key = getStoreKey(request);

    let storeQuery = supabaseAdmin
      .from("stores")
      .select("id,name,subdomain,domain,module_shipping_enabled")
      .eq("is_active", true);
    storeQuery = key.type === "subdomain"
      ? storeQuery.eq("subdomain", key.value)
      : storeQuery.eq("domain", key.value);

    const { data: store, error: storeError } = await storeQuery.maybeSingle();
    if (storeError || !store) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });
    if (store.module_shipping_enabled === false) return NextResponse.json({ error: "El módulo de envíos no está disponible." }, { status: 403 });

    const phone = clean(body.customer_phone).replace(/\D/g, "");
    const customerName = clean(body.customer_name);
    const weight = Number(body.weight_lb);
    const serviceTypeId = clean(body.service_type_id);
    const transportMode = clean(body.transport_mode);

    if (!customerName || !phone || !serviceTypeId || !transportMode || !Number.isFinite(weight) || weight <= 0) {
      return NextResponse.json({ error: "Completa nombre, teléfono, servicio, método y peso correctamente." }, { status: 400 });
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("customer_portal_settings")
      .select("*")
      .eq("store_id", store.id)
      .eq("is_enabled", true)
      .eq("quote_enabled", true)
      .maybeSingle();
    if (settingsError || !settings) return NextResponse.json({ error: "Cotizador no disponible." }, { status: 404 });

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("shipping_service_types")
      .select("id,name,code,billing_mode")
      .eq("id", serviceTypeId)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .maybeSingle();
    if (serviceError || !service) return NextResponse.json({ error: "El servicio seleccionado no está disponible." }, { status: 422 });

    const countryId = clean(body.country_id) || null;
    const provinceId = clean(body.province_id) || null;
    const municipalityId = clean(body.municipality_id) || null;
    const locationId = clean(body.location_id) || null;

    const [countryResult, provinceResult, municipalityResult, locationResult] = await Promise.all([
      countryId ? supabaseAdmin.from("shipping_countries").select("id,name").eq("id", countryId).eq("store_id", store.id).eq("is_active", true).maybeSingle() : Promise.resolve({ data: null, error: null }),
      provinceId ? supabaseAdmin.from("shipping_provinces").select("id,name,country_id").eq("id", provinceId).eq("store_id", store.id).eq("is_active", true).maybeSingle() : Promise.resolve({ data: null, error: null }),
      municipalityId ? supabaseAdmin.from("shipping_municipalities").select("id,name,province_id").eq("id", municipalityId).eq("store_id", store.id).eq("is_active", true).maybeSingle() : Promise.resolve({ data: null, error: null }),
      locationId ? supabaseAdmin.from("shipping_locations").select("id,name,municipality_id").eq("id", locationId).eq("store_id", store.id).eq("is_active", true).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);

    if (countryId && !countryResult.data) return NextResponse.json({ error: "El país seleccionado no es válido." }, { status: 422 });
    if (provinceId && (!provinceResult.data || provinceResult.data.country_id !== countryId)) return NextResponse.json({ error: "La provincia no pertenece al país seleccionado." }, { status: 422 });
    if (municipalityId && (!municipalityResult.data || municipalityResult.data.province_id !== provinceId)) return NextResponse.json({ error: "El municipio no pertenece a la provincia seleccionada." }, { status: 422 });
    if (locationId && (!locationResult.data || locationResult.data.municipality_id !== municipalityId)) return NextResponse.json({ error: "El lugar no pertenece al municipio seleccionado." }, { status: 422 });

    const { data: rates, error: ratesError } = await supabaseAdmin
      .from("shipping_rates")
      .select("*")
      .eq("store_id", store.id)
      .eq("service_type_id", serviceTypeId)
      .eq("transport_mode", transportMode)
      .eq("is_active", true);

    if (ratesError) {
      console.error("PUBLIC QUOTE RATE QUERY ERROR", ratesError);
      return NextResponse.json({ error: "No se pudieron consultar las tarifas." }, { status: 500 });
    }

    const candidates = (rates || []).filter((rate) => {
      if (rate.maximum_weight_lb != null && weight > Number(rate.maximum_weight_lb)) return false;
      if (rate.scope_type === "location") return Boolean(locationId) && rate.location_id === locationId;
      if (rate.scope_type === "municipality") return Boolean(municipalityId) && rate.municipality_id === municipalityId;
      if (rate.scope_type === "province") return Boolean(provinceId) && rate.province_id === provinceId;
      if (rate.scope_type === "country") return Boolean(countryId) && rate.country_id === countryId;
      return false;
    });

    const rate = candidates.sort((a, b) =>
      (SCOPE_SCORE[b.scope_type] || 0) - (SCOPE_SCORE[a.scope_type] || 0) ||
      Number(b.priority || 0) - Number(a.priority || 0)
    )[0];

    if (!rate) {
      return NextResponse.json({ error: "No existe una tarifa para este servicio, método y destino. Contacta a la agencia." }, { status: 422 });
    }

    const billableWeight = Math.max(weight, Number(rate.minimum_weight_lb || 0));
    const shippingAmount = Math.max(
      billableWeight * Number(rate.rate_per_lb || 0) + Number(rate.fixed_fee || 0),
      Number(rate.minimum_charge || 0)
    );
    const pickupAmount = body.pickup_requested && ["paid", "optional"].includes(settings.pickup_mode)
      ? Number(settings.pickup_fee || 20)
      : 0;
    const categoryValue = `${service.code || ""} ${service.name || ""} ${clean(body.item_category)}`.toLowerCase();
    const isEnergyStation = /energ|power|station|bater/.test(categoryValue);
    const airportFeeAmount = isEnergyStation && ["air", "express"].includes(transportMode) ? 50 : 0;
    let insuranceAmount = 0;
    if (body.insurance_requested && settings.insurance_mode === "optional_fixed") insuranceAmount = Number(settings.insurance_value || 0);
    if (body.insurance_requested && settings.insurance_mode === "optional_percentage") insuranceAmount = shippingAmount * Number(settings.insurance_value || 0) / 100;
    const totalAmount = shippingAmount + airportFeeAmount + pickupAmount + insuranceAmount;

    const destinationLabel = [countryResult.data?.name, provinceResult.data?.name, municipalityResult.data?.name, locationResult.data?.name].filter(Boolean).join(" / ");
    const payload = {
      store_id: store.id,
      customer_name: customerName,
      customer_phone: phone,
      customer_email: clean(body.customer_email) || null,
      origin_label: settings.default_origin_label,
      service_type_id: serviceTypeId,
      transport_mode: transportMode,
      item_category: clean(body.item_category) || service.code || "service",
      country_id: countryId,
      province_id: provinceId,
      municipality_id: municipalityId,
      location_id: locationId,
      destination_label: destinationLabel,
      weight_lb: weight,
      quantity: Math.max(1, Number(body.quantity) || 1),
      pickup_requested: Boolean(body.pickup_requested),
      pickup_address: clean(body.pickup_address) || null,
      insurance_requested: Boolean(body.insurance_requested),
      base_amount: shippingAmount + airportFeeAmount,
      pickup_amount: pickupAmount,
      insurance_amount: insuranceAmount,
      total_amount: totalAmount,
      currency: settings.currency || "USD",
      estimated_days_min: rate.estimated_days_min,
      estimated_days_max: rate.estimated_days_max,
      rate_rule_id: null,
      shipping_rate_id: rate.id,
      notes: [clean(body.notes), airportFeeAmount ? "Fee aeroportuario: $50.00" : ""].filter(Boolean).join(" | ") || null,
    };

    const { data: quote, error: insertError } = await supabaseAdmin
      .from("customer_quotes")
      .insert(payload)
      .select("public_code,total_amount,base_amount,pickup_amount,insurance_amount,currency,estimated_days_min,estimated_days_max")
      .single();

    if (insertError || !quote) {
      console.error("PUBLIC QUOTE INSERT ERROR", insertError, payload);
      return NextResponse.json({ error: "No se pudo guardar la cotización." }, { status: 500 });
    }

    const whatsapp = String(settings.whatsapp_phone || "").replace(/\D/g, "");
    const formattedTotal = new Intl.NumberFormat("en-US", { style: "currency", currency: quote.currency }).format(quote.total_amount);
    const message = encodeURIComponent(
      `Hola, deseo continuar con esta cotización de ${store.name}.\n` +
      `Código: ${quote.public_code}\nServicio: ${service.name}\n` +
      `Destino: ${destinationLabel || "Por confirmar"}\nPeso real: ${weight} lb\n` +
      `Peso facturable: ${billableWeight} lb\nMétodo: ${transportMode}\n` +
      `${airportFeeAmount ? "Fee aeroportuario: $50.00\n" : ""}` +
      `${pickupAmount ? `Recogida: $${pickupAmount.toFixed(2)}\n` : ""}` +
      `Total estimado: ${formattedTotal}`
    );

    return NextResponse.json({
      ...quote,
      shipping_amount: shippingAmount,
      airport_fee_amount: airportFeeAmount,
      billable_weight_lb: billableWeight,
      applied_rate: Number(rate.rate_per_lb),
      billing_mode: "per_lb",
      rule_name: `${service.name} · ${transportMode}`,
      destination_label: destinationLabel,
      whatsapp_url: whatsapp && settings.whatsapp_enabled !== false ? `https://wa.me/${whatsapp}?text=${message}` : null,
    });
  } catch (error) {
    console.error("PUBLIC QUOTE UNEXPECTED ERROR", error);
    return NextResponse.json({ error: "No se pudo generar la cotización." }, { status: 500 });
  }
}
