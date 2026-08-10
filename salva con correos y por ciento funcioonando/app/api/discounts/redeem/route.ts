
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeCustomerPhone } from "@/lib/utils/phone";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaignId = String(body.campaignId || "");
    const storeId = String(body.storeId || "");
    const orderId = String(body.orderId || "");
    const phone = normalizeCustomerPhone(String(body.phone || ""));

    if (!campaignId || !storeId || !orderId || !phone) {
      return NextResponse.json(
        { success: false, message: "Datos incompletos para canjear el bono." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.rpc(
      "claim_discount_coupon",
      {
        p_campaign_id: campaignId,
        p_store_id: storeId,
        p_customer_phone: phone,
        p_order_id: orderId,
      }
    );

    if (error) throw error;

    const result = data?.[0];

    if (!result?.success) {
      return NextResponse.json(
        {
          success: false,
          message: result?.message || "No se pudo canjear el bono.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("REDEEM DISCOUNT ERROR:", error);
    return NextResponse.json(
      { success: false, message: "No se pudo canjear el bono." },
      { status: 500 }
    );
  }
}
