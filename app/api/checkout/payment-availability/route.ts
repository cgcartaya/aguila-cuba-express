import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const storeId = String(request.nextUrl.searchParams.get("storeId") || "").trim();
  if (!storeId) return NextResponse.json({ available: false });

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("stripe_account_id, stripe_charges_enabled")
    .eq("id", storeId)
    .maybeSingle();

  return NextResponse.json({
    available: Boolean(store?.stripe_account_id && store?.stripe_charges_enabled),
  });
}
