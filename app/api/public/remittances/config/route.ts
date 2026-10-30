import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0].replace(/^www\./, "").toLowerCase();
  const suffix = ".perlamarketplace.com";
  let query = supabaseAdmin.from("stores").select("id,name").eq("is_active", true).eq("module_shipping_enabled", true);
  query = host.endsWith(suffix) ? query.eq("subdomain", host.slice(0, -suffix.length)) : query.eq("domain", host);
  const { data: store, error: storeError } = await query.maybeSingle();
  const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (storeError) return respond({ error: "No se pudieron cargar las tarifas." }, 500);
  if (!store) return respond({ error: "Agencia no encontrada." }, 404);
  const { data: settings, error } = await supabaseAdmin.from("shipping_settings")
    .select("currency,money_fixed_fee_below,money_fixed_fee,money_threshold,money_rate_below_threshold,money_rate_at_or_above_threshold")
    .eq("store_id", store.id).maybeSingle();
  if (error) return respond({ error: "No se pudieron cargar las tarifas." }, 500);
  if (!settings) return respond({ error: "Consulta las tarifas con la agencia." }, 404);
  return respond({ settings });
}
