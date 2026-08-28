import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchElToqueRates } from "@/lib/services/eltoque-rate";

export const maxDuration = 30;

function safeChange(next: number, current: unknown) {
  const previous = Number(current || 0);
  return previous <= 0 || Math.abs(next - previous) / previous <= 0.35;
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  let body: { storeId?: string } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 }); }
  if (!body.storeId) return NextResponse.json({ error: "Falta storeId." }, { status: 400 });

  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
  const { data: hasAccess, error: accessError } = await userClient.rpc("user_has_store_access", { target_store_id: body.storeId });
  if (accessError || hasAccess !== true) return NextResponse.json({ error: "No tienes acceso a esta tienda." }, { status: 403 });

  try {
    const rates = await fetchElToqueRates();
    const { data: current, error: currentError } = await supabaseAdmin
      .from("store_settings")
      .select("id, menu_cup_per_usd, menu_exchange_rate_source, menu_cup_per_eur, menu_eur_exchange_rate_source")
      .eq("store_id", body.storeId).maybeSingle();
    if (currentError || !current) return NextResponse.json({ error: "No se encontró la configuración de la tienda." }, { status: 404 });

    const patch: Record<string, unknown> = {};
    if (current.menu_exchange_rate_source === "eltoque" && safeChange(rates.USD.rate, current.menu_cup_per_usd)) {
      patch.menu_cup_per_usd = rates.USD.rate;
      patch.menu_exchange_rate_updated_at = rates.USD.fetchedAt;
    }
    if (current.menu_eur_exchange_rate_source === "eltoque" && safeChange(rates.EUR.rate, current.menu_cup_per_eur)) {
      patch.menu_cup_per_eur = rates.EUR.rate;
      patch.menu_eur_exchange_rate_updated_at = rates.EUR.fetchedAt;
    }
    if (!Object.keys(patch).length) return NextResponse.json({ error: "Activa elTOQUE para USD o EUR, o revisa la tasa anterior: el cambio supera el límite de seguridad." }, { status: 409 });
    const { error: updateError } = await supabaseAdmin.from("store_settings").update(patch).eq("id", current.id);
    if (updateError) return NextResponse.json({ error: "No se pudieron guardar las tasas automáticas." }, { status: 500 });
    return NextResponse.json({ ok: true, usd: patch.menu_cup_per_usd ?? current.menu_cup_per_usd, eur: patch.menu_cup_per_eur ?? current.menu_cup_per_eur, fetchedAt: rates.USD.fetchedAt });
  } catch (error) {
    console.error("Falló la actualización manual desde elTOQUE:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudieron obtener las tasas de elTOQUE.", preservedPreviousRates: true }, { status: 502 });
  }
}
