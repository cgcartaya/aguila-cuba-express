import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const platform = "perlamarketplace.com";
function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function hostKey(req: NextRequest) { const host = (req.headers.get("host") || "").split(":")[0].replace(/^www\./, ""); return host.endsWith(`.${platform}`) ? { subdomain: host.slice(0, -(`.${platform}`.length)) } : { domain: host }; }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const key = hostKey(req);
    let storeQuery = supabase.from("stores").select("id,name,subdomain,domain").eq("is_active", true);
    storeQuery = "subdomain" in key ? storeQuery.eq("subdomain", key.subdomain) : storeQuery.eq("domain", key.domain);
    const { data: store } = await storeQuery.maybeSingle();
    if (!store) return NextResponse.json({ error: "Empresa no encontrada." }, { status: 404 });

    const phone = clean(body.customer_phone).replace(/[^0-9+]/g, "");
    const weight = Number(body.weight_lb);
    if (!phone || !Number.isFinite(weight) || weight <= 0) return NextResponse.json({ error: "Completa teléfono y peso correctamente." }, { status: 400 });

    const { data: settings } = await supabase.from("customer_portal_settings").select("*").eq("store_id", store.id).eq("is_enabled", true).eq("quote_enabled", true).maybeSingle();
    if (!settings) return NextResponse.json({ error: "Cotizador no disponible." }, { status: 404 });

    let query = supabase.from("quote_rate_rules").select("*").eq("store_id", store.id).eq("is_active", true).eq("transport_mode", clean(body.transport_mode)).eq("item_category", clean(body.item_category)).order("priority", { ascending: true });
    if (body.service_type_id) query = query.eq("service_type_id", body.service_type_id);
    const { data: rules } = await query;
    const now = Date.now();
    const candidates = (rules || []).filter((rule) =>
      (!rule.maximum_weight_lb || weight <= Number(rule.maximum_weight_lb)) &&
      (!rule.country_id || rule.country_id === body.country_id) &&
      (!rule.province_id || rule.province_id === body.province_id) &&
      (!rule.municipality_id || rule.municipality_id === body.municipality_id) &&
      (!rule.location_id || rule.location_id === body.location_id) &&
      (!rule.starts_at || new Date(rule.starts_at).getTime() <= now) &&
      (!rule.ends_at || new Date(rule.ends_at).getTime() >= now)
    );
    const rule = candidates.sort((a, b) => {
      const specificityA = [a.location_id, a.municipality_id, a.province_id, a.country_id].filter(Boolean).length;
      const specificityB = [b.location_id, b.municipality_id, b.province_id, b.country_id].filter(Boolean).length;
      return specificityB - specificityA || Number(a.priority) - Number(b.priority);
    })[0];
    if (!rule) return NextResponse.json({ error: "No existe una tarifa configurada para esta combinación. Contacta a la agencia." }, { status: 422 });
    if (rule.billing_mode === "quote_only") return NextResponse.json({ error: "Este tipo de envío requiere revisión manual. Envíanos la solicitud por WhatsApp." }, { status: 422 });

    const quantity = Math.max(1, Number(body.quantity) || 1);
    const billableWeight = Math.max(weight, Number(rule.minimum_weight_lb || 0));
    let base = rule.billing_mode === "per_lb" ? billableWeight * Number(rule.rate) : rule.billing_mode === "fixed" ? Number(rule.rate) : quantity * Number(rule.rate);
    base = Math.max(base + Number(rule.fixed_fee || 0), Number(rule.minimum_charge || 0));
    const pickup = body.pickup_requested && ["paid", "optional"].includes(settings.pickup_mode) ? Number(settings.pickup_fee || 0) : 0;
    let insurance = 0;
    if (body.insurance_requested && settings.insurance_mode === "optional_fixed") insurance = Number(settings.insurance_value || 0);
    if (body.insurance_requested && settings.insurance_mode === "optional_percentage") insurance = base * Number(settings.insurance_value || 0) / 100;
    const total = base + pickup + insurance;

    const destinationNames = await Promise.all([
      body.country_id ? supabase.from("shipping_countries").select("name").eq("id", body.country_id).maybeSingle() : Promise.resolve({ data: null }),
      body.province_id ? supabase.from("shipping_provinces").select("name").eq("id", body.province_id).maybeSingle() : Promise.resolve({ data: null }),
      body.municipality_id ? supabase.from("shipping_municipalities").select("name").eq("id", body.municipality_id).maybeSingle() : Promise.resolve({ data: null }),
      body.location_id ? supabase.from("shipping_locations").select("name").eq("id", body.location_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const destination = destinationNames.map((item: any) => item.data?.name).filter(Boolean).join(" / ");
    const payload = { store_id: store.id, customer_name: clean(body.customer_name), customer_phone: phone, customer_email: clean(body.customer_email) || null, origin_label: settings.default_origin_label, service_type_id: body.service_type_id || null, transport_mode: clean(body.transport_mode), item_category: clean(body.item_category), country_id: body.country_id || null, province_id: body.province_id || null, municipality_id: body.municipality_id || null, location_id: body.location_id || null, destination_label: destination, weight_lb: weight, quantity, pickup_requested: !!body.pickup_requested, pickup_address: clean(body.pickup_address) || null, insurance_requested: !!body.insurance_requested, base_amount: base, pickup_amount: pickup, insurance_amount: insurance, total_amount: total, currency: settings.currency, estimated_days_min: rule.estimated_days_min, estimated_days_max: rule.estimated_days_max, rate_rule_id: rule.id, notes: clean(body.notes) || null };
    const { data: quote, error } = await supabase.from("customer_quotes").insert(payload).select("public_code,total_amount,base_amount,pickup_amount,insurance_amount,currency,estimated_days_min,estimated_days_max").single();
    if (error) throw error;
    const message = encodeURIComponent(`Hola, deseo continuar con esta cotización de ${store.name}.\nCódigo: ${quote.public_code}\nDestino: ${destination || "Por confirmar"}\nPeso real: ${weight} lb\nPeso facturable: ${billableWeight} lb\nMétodo: ${clean(body.transport_mode)}\nTotal estimado: ${new Intl.NumberFormat("en-US", { style: "currency", currency: quote.currency }).format(quote.total_amount)}`);
    const whatsapp = (settings.whatsapp_phone || "").replace(/\D/g, "");
    return NextResponse.json({ ...quote, billable_weight_lb: billableWeight, applied_rate: Number(rule.rate), billing_mode: rule.billing_mode, rule_name: rule.name, destination_label: destination, whatsapp_url: whatsapp && settings.whatsapp_enabled !== false ? `https://wa.me/${whatsapp}?text=${message}` : null });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo generar la cotización." }, { status: 500 });
  }
}
