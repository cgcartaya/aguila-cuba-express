import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PLATFORM_DOMAIN = "perlamarketplace.com";

type StoreKey =
  | { type: "subdomain"; value: string }
  | { type: "domain"; value: string };

type QuoteBody = {
  customer_name?: unknown;
  customer_phone?: unknown;
  customer_email?: unknown;
  service_type_id?: unknown;
  transport_mode?: unknown;
  item_category?: unknown;
  country_id?: unknown;
  province_id?: unknown;
  municipality_id?: unknown;
  location_id?: unknown;
  weight_lb?: unknown;
  quantity?: unknown;
  pickup_requested?: unknown;
  pickup_address?: unknown;
  insurance_requested?: unknown;
  notes?: unknown;
};

type RateRule = {
  id: string;
  name: string;
  service_type_id: string | null;
  country_id: string | null;
  province_id: string | null;
  municipality_id: string | null;
  location_id: string | null;
  item_category: string;
  transport_mode: string;
  billing_mode: "per_lb" | "fixed" | "per_item" | "quote_only" | string;
  rate: number | string;
  minimum_weight_lb: number | string | null;
  maximum_weight_lb: number | string | null;
  minimum_charge: number | string | null;
  fixed_fee: number | string | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  priority: number | string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalId(value: unknown): string | null {
  const result = clean(value);
  return result || null;
}

function normalizePhone(value: unknown): string {
  return clean(value).replace(/\D/g, "");
}

function getStoreKey(request: NextRequest): StoreKey {
  const host = (request.headers.get("host") || "")
    .split(":")[0]
    .replace(/^www\./, "")
    .toLowerCase()
    .trim();

  if (host.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return {
      type: "subdomain",
      value: host.slice(0, -(`.${PLATFORM_DOMAIN}`.length)),
    };
  }

  return { type: "domain", value: host };
}

function specificity(rule: RateRule): number {
  if (rule.location_id) return 4;
  if (rule.municipality_id) return 3;
  if (rule.province_id) return 2;
  if (rule.country_id) return 1;
  return 0;
}

function ruleMatchesDestination(
  rule: RateRule,
  destination: {
    countryId: string | null;
    provinceId: string | null;
    municipalityId: string | null;
    locationId: string | null;
  }
): boolean {
  if (rule.country_id && rule.country_id !== destination.countryId) return false;
  if (rule.province_id && rule.province_id !== destination.provinceId) return false;
  if (
    rule.municipality_id &&
    rule.municipality_id !== destination.municipalityId
  ) {
    return false;
  }
  if (rule.location_id && rule.location_id !== destination.locationId) {
    return false;
  }
  return true;
}

function ruleIsCurrentlyValid(rule: RateRule, now: number): boolean {
  if (rule.starts_at) {
    const startsAt = new Date(rule.starts_at).getTime();
    if (Number.isFinite(startsAt) && startsAt > now) return false;
  }

  if (rule.ends_at) {
    const endsAt = new Date(rule.ends_at).getTime();
    if (Number.isFinite(endsAt) && endsAt < now) return false;
  }

  return true;
}

function safeCurrency(value: unknown): string {
  const currency = clean(value).toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : "USD";
}

function publicErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "Error desconocido.";

  const candidate = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return [candidate.message, candidate.details, candidate.hint]
    .filter(Boolean)
    .join(" · ") || "Error desconocido.";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuoteBody;
    const key = getStoreKey(request);

    let storeQuery = supabaseAdmin
      .from("stores")
      .select("id,name,subdomain,domain,is_active,module_shipping_enabled")
      .eq("is_active", true);

    storeQuery =
      key.type === "subdomain"
        ? storeQuery.eq("subdomain", key.value)
        : storeQuery.eq("domain", key.value);

    const { data: store, error: storeError } = await storeQuery.maybeSingle();

    if (storeError) {
      console.error("PUBLIC QUOTE STORE ERROR", storeError);
      return NextResponse.json(
        { error: "No se pudo resolver la empresa." },
        { status: 500 }
      );
    }

    if (!store) {
      return NextResponse.json(
        { error: "Empresa no encontrada." },
        { status: 404 }
      );
    }

    if (store.module_shipping_enabled === false) {
      return NextResponse.json(
        { error: "El módulo de envíos no está activo para esta empresa." },
        { status: 403 }
      );
    }

    const customerName = clean(body.customer_name);
    const customerPhone = normalizePhone(body.customer_phone);
    const customerEmail = clean(body.customer_email) || null;
    const serviceTypeId = optionalId(body.service_type_id);
    const transportMode = clean(body.transport_mode);
    const itemCategory = clean(body.item_category);
    const countryId = optionalId(body.country_id);
    const provinceId = optionalId(body.province_id);
    const municipalityId = optionalId(body.municipality_id);
    const locationId = optionalId(body.location_id);
    const weight = Number(body.weight_lb);
    const quantity = Math.max(1, Number(body.quantity) || 1);

    if (!customerName) {
      return NextResponse.json(
        { error: "Escribe tu nombre." },
        { status: 400 }
      );
    }

    if (!customerPhone) {
      return NextResponse.json(
        { error: "Escribe un teléfono válido." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      return NextResponse.json(
        { error: "Escribe un peso válido." },
        { status: 400 }
      );
    }

    if (!serviceTypeId || !transportMode || !itemCategory) {
      return NextResponse.json(
        { error: "Selecciona servicio, método y tipo de contenido." },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("customer_portal_settings")
      .select("*")
      .eq("store_id", store.id)
      .eq("is_enabled", true)
      .eq("quote_enabled", true)
      .maybeSingle();

    if (settingsError) {
      console.error("PUBLIC QUOTE SETTINGS ERROR", settingsError);
      return NextResponse.json(
        { error: "No se pudo cargar la configuración del cotizador." },
        { status: 500 }
      );
    }

    if (!settings) {
      return NextResponse.json(
        { error: "El cotizador no está disponible." },
        { status: 404 }
      );
    }

    const { data: service, error: serviceError } = await supabaseAdmin
      .from("shipping_service_types")
      .select("id,name,is_active")
      .eq("id", serviceTypeId)
      .eq("store_id", store.id)
      .eq("is_active", true)
      .maybeSingle();

    if (serviceError) {
      console.error("PUBLIC QUOTE SERVICE ERROR", serviceError);
      return NextResponse.json(
        { error: "No se pudo validar el servicio seleccionado." },
        { status: 500 }
      );
    }

    if (!service) {
      return NextResponse.json(
        { error: "El servicio seleccionado no está disponible." },
        { status: 422 }
      );
    }

    const destinationChecks = await Promise.all([
      countryId
        ? supabaseAdmin
            .from("shipping_countries")
            .select("id,name")
            .eq("id", countryId)
            .eq("store_id", store.id)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      provinceId
        ? supabaseAdmin
            .from("shipping_provinces")
            .select("id,name,country_id")
            .eq("id", provinceId)
            .eq("store_id", store.id)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      municipalityId
        ? supabaseAdmin
            .from("shipping_municipalities")
            .select("id,name,province_id")
            .eq("id", municipalityId)
            .eq("store_id", store.id)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      locationId
        ? supabaseAdmin
            .from("shipping_locations")
            .select("id,name,municipality_id")
            .eq("id", locationId)
            .eq("store_id", store.id)
            .eq("is_active", true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const destinationError = destinationChecks
      .map((result) => result.error)
      .find(Boolean);

    if (destinationError) {
      console.error("PUBLIC QUOTE DESTINATION ERROR", destinationError);
      return NextResponse.json(
        { error: "No se pudo validar el destino seleccionado." },
        { status: 500 }
      );
    }

    const [countryResult, provinceResult, municipalityResult, locationResult] =
      destinationChecks;

    if (countryId && !countryResult.data) {
      return NextResponse.json(
        { error: "El país seleccionado no pertenece a esta empresa." },
        { status: 422 }
      );
    }

    if (provinceId && !provinceResult.data) {
      return NextResponse.json(
        { error: "La provincia seleccionada no está disponible." },
        { status: 422 }
      );
    }

    if (
      provinceResult.data &&
      countryId &&
      provinceResult.data.country_id !== countryId
    ) {
      return NextResponse.json(
        { error: "La provincia no pertenece al país seleccionado." },
        { status: 422 }
      );
    }

    if (municipalityId && !municipalityResult.data) {
      return NextResponse.json(
        { error: "El municipio seleccionado no está disponible." },
        { status: 422 }
      );
    }

    if (
      municipalityResult.data &&
      provinceId &&
      municipalityResult.data.province_id !== provinceId
    ) {
      return NextResponse.json(
        { error: "El municipio no pertenece a la provincia seleccionada." },
        { status: 422 }
      );
    }

    if (locationId && !locationResult.data) {
      return NextResponse.json(
        { error: "El lugar seleccionado no está disponible." },
        { status: 422 }
      );
    }

    if (
      locationResult.data &&
      municipalityId &&
      locationResult.data.municipality_id !== municipalityId
    ) {
      return NextResponse.json(
        { error: "El lugar no pertenece al municipio seleccionado." },
        { status: 422 }
      );
    }

    const { data: ruleRows, error: ruleError } = await supabaseAdmin
      .from("quote_rate_rules")
      .select(
        "id,name,service_type_id,country_id,province_id,municipality_id,location_id,item_category,transport_mode,billing_mode,rate,minimum_weight_lb,maximum_weight_lb,minimum_charge,fixed_fee,estimated_days_min,estimated_days_max,priority,starts_at,ends_at"
      )
      .eq("store_id", store.id)
      .eq("is_active", true)
      .eq("service_type_id", serviceTypeId)
      .eq("transport_mode", transportMode)
      .eq("item_category", itemCategory);

    if (ruleError) {
      console.error("PUBLIC QUOTE RULE QUERY ERROR", ruleError);
      return NextResponse.json(
        { error: "No se pudieron consultar las tarifas." },
        { status: 500 }
      );
    }

    const now = Date.now();
    const destination = {
      countryId,
      provinceId,
      municipalityId,
      locationId,
    };

    const candidates = ((ruleRows || []) as RateRule[])
      .filter((rule) => {
        const maxWeight = Number(rule.maximum_weight_lb || 0);
        if (maxWeight > 0 && weight > maxWeight) return false;
        if (!ruleIsCurrentlyValid(rule, now)) return false;
        return ruleMatchesDestination(rule, destination);
      })
      .sort((a, b) => {
        const specificityDifference = specificity(b) - specificity(a);
        if (specificityDifference !== 0) return specificityDifference;
        return Number(b.priority || 0) - Number(a.priority || 0);
      });

    const rule = candidates[0];

    if (!rule) {
      return NextResponse.json(
        {
          error:
            "No existe una tarifa configurada para esta combinación. Contacta a la agencia.",
        },
        { status: 422 }
      );
    }

    if (rule.billing_mode === "quote_only") {
      return NextResponse.json(
        {
          error:
            "Este tipo de envío requiere revisión manual. Contacta a la agencia por WhatsApp.",
        },
        { status: 422 }
      );
    }

    const rate = Number(rule.rate || 0);
    const minimumWeight = Math.max(0, Number(rule.minimum_weight_lb || 0));
    const billableWeight = Math.max(weight, minimumWeight);
    const fixedFee = Math.max(0, Number(rule.fixed_fee || 0));
    const minimumCharge = Math.max(0, Number(rule.minimum_charge || 0));

    if (!Number.isFinite(rate) || rate < 0) {
      console.error("PUBLIC QUOTE INVALID RATE", { ruleId: rule.id, rate });
      return NextResponse.json(
        { error: "La tarifa seleccionada no es válida." },
        { status: 500 }
      );
    }

    let subtotal = 0;

    if (rule.billing_mode === "per_lb") {
      subtotal = billableWeight * rate;
    } else if (rule.billing_mode === "fixed") {
      subtotal = rate;
    } else if (rule.billing_mode === "per_item") {
      subtotal = quantity * rate;
    } else {
      return NextResponse.json(
        { error: "La forma de cobro configurada no es compatible." },
        { status: 422 }
      );
    }

    const baseAmount = Math.max(subtotal + fixedFee, minimumCharge);

    const pickupRequested = body.pickup_requested === true;
    const pickupMode = clean(settings.pickup_mode);
    const pickupAmount =
      pickupRequested && ["paid", "optional"].includes(pickupMode)
        ? Math.max(0, Number(settings.pickup_fee || 0))
        : 0;

    const insuranceRequested = body.insurance_requested === true;
    const insuranceMode = clean(settings.insurance_mode);
    const insuranceValue = Math.max(0, Number(settings.insurance_value || 0));
    let insuranceAmount = 0;

    if (insuranceRequested && insuranceMode === "optional_fixed") {
      insuranceAmount = insuranceValue;
    }

    if (insuranceRequested && insuranceMode === "optional_percentage") {
      insuranceAmount = (baseAmount * insuranceValue) / 100;
    }

    const totalAmount = baseAmount + pickupAmount + insuranceAmount;
    const currency = safeCurrency(settings.currency);

    const destinationLabel = [
      countryResult.data?.name,
      provinceResult.data?.name,
      municipalityResult.data?.name,
      locationResult.data?.name,
    ]
      .filter(Boolean)
      .join(" / ");

    const quotePayload = {
      store_id: store.id,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      origin_label: clean(settings.default_origin_label) || null,
      service_type_id: serviceTypeId,
      transport_mode: transportMode,
      item_category: itemCategory,
      country_id: countryId,
      province_id: provinceId,
      municipality_id: municipalityId,
      location_id: locationId,
      destination_label: destinationLabel || null,
      weight_lb: weight,
      quantity,
      pickup_requested: pickupRequested,
      pickup_address: clean(body.pickup_address) || null,
      insurance_requested: insuranceRequested,
      base_amount: baseAmount,
      pickup_amount: pickupAmount,
      insurance_amount: insuranceAmount,
      total_amount: totalAmount,
      currency,
      estimated_days_min: rule.estimated_days_min,
      estimated_days_max: rule.estimated_days_max,
      rate_rule_id: rule.id,
      notes: clean(body.notes) || null,
    };

    const { data: quote, error: quoteError } = await supabaseAdmin
      .from("customer_quotes")
      .insert(quotePayload)
      .select(
        "public_code,total_amount,base_amount,pickup_amount,insurance_amount,currency,estimated_days_min,estimated_days_max"
      )
      .single();

    if (quoteError) {
      console.error("PUBLIC QUOTE INSERT ERROR", {
        code: quoteError.code,
        message: quoteError.message,
        details: quoteError.details,
        hint: quoteError.hint,
        storeId: store.id,
        ruleId: rule.id,
      });

      return NextResponse.json(
        {
          error: "No se pudo guardar la cotización.",
          ...(process.env.NODE_ENV !== "production"
            ? { details: publicErrorMessage(quoteError), code: quoteError.code }
            : {}),
        },
        { status: 500 }
      );
    }

    const formattedTotal = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: quote.currency,
    }).format(Number(quote.total_amount || 0));

    const whatsappMessage = encodeURIComponent(
      [
        `Hola, deseo continuar con esta cotización de ${store.name}.`,
        `Código: ${quote.public_code}`,
        `Servicio: ${service.name}`,
        `Destino: ${destinationLabel || "Por confirmar"}`,
        `Peso real: ${weight} lb`,
        `Peso facturable: ${billableWeight} lb`,
        `Método: ${transportMode}`,
        `Total estimado: ${formattedTotal}`,
      ].join("\n")
    );

    const whatsapp = clean(settings.whatsapp_phone).replace(/\D/g, "");

    return NextResponse.json({
      ...quote,
      service_name: service.name,
      billable_weight_lb: billableWeight,
      applied_rate: rate,
      billing_mode: rule.billing_mode,
      rule_name: rule.name,
      destination_label: destinationLabel,
      whatsapp_url:
        whatsapp && settings.whatsapp_enabled !== false
          ? `https://wa.me/${whatsapp}?text=${whatsappMessage}`
          : null,
    });
  } catch (error) {
    console.error("PUBLIC QUOTE UNEXPECTED ERROR", error);

    return NextResponse.json(
      {
        error: "No se pudo generar la cotización.",
        ...(process.env.NODE_ENV !== "production"
          ? { details: publicErrorMessage(error) }
          : {}),
      },
      { status: 500 }
    );
  }
}
