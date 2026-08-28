import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchElToqueUsdCupRate } from "@/lib/services/eltoque-rate";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !url || !anonKey) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: { storeId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  if (!body.storeId) {
    return NextResponse.json({ error: "Falta storeId." }, { status: 400 });
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
  }

  const { data: hasAccess, error: accessError } = await userClient.rpc("user_has_store_access", {
    target_store_id: body.storeId,
  });

  if (accessError || hasAccess !== true) {
    return NextResponse.json({ error: "No tienes acceso a esta tienda." }, { status: 403 });
  }

  try {
    const result = await fetchElToqueUsdCupRate();

    const { data: current, error: currentError } = await supabaseAdmin
      .from("store_settings")
      .select("id, menu_cup_per_usd, menu_exchange_rate_source")
      .eq("store_id", body.storeId)
      .maybeSingle();

    if (currentError || !current) {
      return NextResponse.json({ error: "No se encontró la configuración de la tienda." }, { status: 404 });
    }

    if (current.menu_exchange_rate_source !== "eltoque") {
      return NextResponse.json({ error: "Primero selecciona elTOQUE como fuente y guarda." }, { status: 409 });
    }

    const previous = Number(current.menu_cup_per_usd || 0);
    if (previous > 0) {
      const deltaPercent = Math.abs(result.rate - previous) / previous;
      if (deltaPercent > 0.35) {
        return NextResponse.json(
          {
            error: `La nueva tasa (${result.rate}) cambia más de 35% frente a la anterior (${previous}); se conservó la tasa previa por seguridad.`,
            preservedPreviousRate: true,
          },
          { status: 422 }
        );
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("store_settings")
      .update({
        menu_cup_per_usd: result.rate,
        menu_exchange_rate_updated_at: result.fetchedAt,
      })
      .eq("id", current.id)
      .eq("menu_exchange_rate_source", "eltoque");

    if (updateError) {
      return NextResponse.json({ error: "No se pudo guardar la tasa automática." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      rate: result.rate,
      fetchedAt: result.fetchedAt,
    });
  } catch (error) {
    console.error("Falló la actualización manual desde elTOQUE:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "No se pudo obtener la tasa de elTOQUE.",
        preservedPreviousRate: true,
      },
      { status: 502 }
    );
  }
}
