import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchElToqueRates } from "@/lib/services/eltoque-rate";

export const maxDuration = 30;

function safeChange(next: number, current: unknown) {
  const previous = Number(current || 0);
  return previous <= 0 || Math.abs(next - previous) / previous <= 0.35;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  try {
    const rates = await fetchElToqueRates();
    const { data: rows, error } = await supabaseAdmin
      .from("store_settings")
      .select("id, menu_cup_per_usd, menu_exchange_rate_source, menu_cup_per_eur, menu_eur_exchange_rate_source")
      .or("menu_exchange_rate_source.eq.eltoque,menu_eur_exchange_rate_source.eq.eltoque");
    if (error) return NextResponse.json({ error: "No se pudo leer la configuración de restaurantes." }, { status: 500 });

    let updatedUsd = 0;
    let updatedEur = 0;
    let skipped = 0;
    for (const row of rows || []) {
      const patch: Record<string, unknown> = {};
      if (row.menu_exchange_rate_source === "eltoque") {
        if (safeChange(rates.USD.rate, row.menu_cup_per_usd)) {
          patch.menu_cup_per_usd = rates.USD.rate;
          patch.menu_exchange_rate_updated_at = rates.USD.fetchedAt;
          updatedUsd++;
        } else skipped++;
      }
      if (row.menu_eur_exchange_rate_source === "eltoque") {
        if (safeChange(rates.EUR.rate, row.menu_cup_per_eur)) {
          patch.menu_cup_per_eur = rates.EUR.rate;
          patch.menu_eur_exchange_rate_updated_at = rates.EUR.fetchedAt;
          updatedEur++;
        } else skipped++;
      }
      if (Object.keys(patch).length) {
        const { error: updateError } = await supabaseAdmin.from("store_settings").update(patch).eq("id", row.id);
        if (updateError) console.error(`Error actualizando tasas ${row.id}:`, updateError);
      }
    }
    return NextResponse.json({ ok: true, usd: rates.USD.rate, eur: rates.EUR.rate, fetchedAt: rates.USD.fetchedAt, updatedUsd, updatedEur, skipped });
  } catch (error) {
    console.error("Falló la actualización automática de elTOQUE:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "No se pudieron obtener las tasas de elTOQUE.", preservedPreviousRates: true }, { status: 502 });
  }
}
