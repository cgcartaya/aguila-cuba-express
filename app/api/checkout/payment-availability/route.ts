import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreStripeContext } from "@/lib/services/stripe-admin";

export async function GET(request: NextRequest) {
  const storeId = String(request.nextUrl.searchParams.get("storeId") || "").trim();
  if (!storeId) return NextResponse.json({ available: false });

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("stripe_mode, stripe_account_id, stripe_charges_enabled, stripe_direct_secret_key")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) return NextResponse.json({ available: false });

  // getStoreStripeContext ya sabe distinguir "connect" de "direct" — antes
  // esta ruta solo miraba stripe_charges_enabled (modo connect), por eso
  // el botón de tarjeta no aparecía para tiendas en modo "direct" aunque
  // ya tuvieran su secret key guardada.
  const available = Boolean(getStoreStripeContext(store));

  return NextResponse.json(
    { available },
    {
      headers: {
        // Dato público y pequeño. Cache corto para no consultar Stripe/store
        // en cada apertura del checkout.
        "Cache-Control": "public, max-age=15, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
