import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { fetchElToqueUsdCupRate } from "@/lib/services/eltoque-rate";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await fetchElToqueUsdCupRate();

    const { data: configuredStores, error: readError } = await supabaseAdmin
      .from("store_settings")
      .select("id, store_id, menu_cup_per_usd")
      .eq("menu_exchange_rate_source", "eltoque");

    if (readError) {
      console.error("Error leyendo restaurantes configurados con elTOQUE:", readError);
      return NextResponse.json({ error: "No se pudo leer la configuración de restaurantes." }, { status: 500 });
    }

    const rows = configuredStores || [];
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const current = Number(row.menu_cup_per_usd || 0);

      if (current > 0) {
        const deltaPercent = Math.abs(result.rate - current) / current;
        if (deltaPercent > 0.35) {
          console.warn(
            `Tasa elTOQUE ignorada para store_settings ${row.id}: cambio de ${(deltaPercent * 100).toFixed(1)}% (${current} -> ${result.rate})`
          );
          skipped++;
          continue;
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from("store_settings")
        .update({
          menu_cup_per_usd: result.rate,
          menu_exchange_rate_updated_at: result.fetchedAt,
        })
        .eq("id", row.id)
        .eq("menu_exchange_rate_source", "eltoque");

      if (updateError) {
        console.error(`Error actualizando store_settings ${row.id}:`, updateError);
        skipped++;
        continue;
      }

      updated++;
    }

    return NextResponse.json({
      ok: true,
      rate: result.rate,
      fetchedAt: result.fetchedAt,
      updatedStores: updated,
      skippedStores: skipped,
    });
  } catch (error) {
    console.error("Falló la actualización automática de elTOQUE:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo obtener la tasa de elTOQUE.",
        preservedPreviousRate: true,
      },
      { status: 502 }
    );
  }
}
