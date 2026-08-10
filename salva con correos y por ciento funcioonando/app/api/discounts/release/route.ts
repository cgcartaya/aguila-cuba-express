
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCustomerPhone } from "@/lib/utils/phone";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    await supabaseAdmin.rpc("release_discount_coupon", {
      p_campaign_id: String(body.campaignId || ""),
      p_customer_phone: normalizeCustomerPhone(String(body.phone || "")),
      p_order_id: String(body.orderId || ""),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("RELEASE DISCOUNT ERROR:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
