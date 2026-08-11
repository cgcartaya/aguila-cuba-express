import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStoreStripeContext } from "@/lib/services/stripe-admin";

const getCachedPaymentAvailability = unstable_cache(
  async (storeId: string) => {
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("stripe_mode, stripe_account_id, stripe_charges_enabled, stripe_direct_secret_key")
      .eq("id", storeId)
      .maybeSingle();

    if (!store) return false;
    return Boolean(getStoreStripeContext(store));
  },
  ["payment-availability-v2"],
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
