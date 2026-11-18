import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCloverSettings } from "@/lib/services/clover-admin";
import { squareCheckoutAvailable } from "@/lib/services/square-checkout";
import { getStoreStripeContext } from "@/lib/services/stripe-admin";

const getCachedPaymentAvailability = unstable_cache(
  async (storeId: string) => {
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("slug, stripe_mode, stripe_account_id, stripe_charges_enabled, stripe_direct_secret_key, active_payment_provider")
      .eq("id", storeId)
      .maybeSingle();

    if (!store || store.slug === "lym") return false;
    if (store.active_payment_provider === "square") return squareCheckoutAvailable(storeId).catch(() => false);
    if (store.active_payment_provider === "stripe") return Boolean(getStoreStripeContext(store));
    const clover = await getCloverSettings(storeId);
    const cloverAvailable = Boolean(clover?.enabled && clover.private_token && clover.webhook_secret);
    if (store.active_payment_provider === "clover") return cloverAvailable;
    return cloverAvailable || Boolean(getStoreStripeContext(store));
  },
  ["payment-availability-v4"],
  { revalidate: 60, tags: ["payment-availability"] },
);

export async function GET(request: NextRequest) {
  const storeId = String(request.nextUrl.searchParams.get("storeId") || "").trim();
  if (!storeId) return NextResponse.json({ available: false }, { headers: { "Cache-Control": "no-store" } });

  const available = await getCachedPaymentAvailability(storeId);
  return NextResponse.json(
    { available },
    { headers: { "Cache-Control": "no-store" } },
  );
}
