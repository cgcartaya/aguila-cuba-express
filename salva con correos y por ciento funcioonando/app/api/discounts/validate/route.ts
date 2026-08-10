
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  isValidCustomerPhone,
  normalizeCustomerPhone,
} from "@/lib/utils/phone";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storeId = String(body.storeId || "");
    const code = String(body.code || "").trim().toUpperCase();
    const phone = normalizeCustomerPhone(String(body.phone || ""));
    const subtotal = Number(body.subtotal || 0);

    if (!storeId || !code || !isValidCustomerPhone(phone)) {
      return NextResponse.json(
        { valid: false, message: "Código o teléfono inválido." },
        { status: 400 }
      );
    }

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("discount_campaigns")
      .select("*")
      .eq("store_id", storeId)
      .eq("code", code)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (campaignError) throw campaignError;

    if (!campaign) {
      return NextResponse.json({
        valid: false,
        message: "El bono no existe, está desactivado o venció.",
      });
    }

    const { data: authorized, error: customerError } = await supabaseAdmin
      .from("discount_campaign_customers")
      .select("id, status")
      .eq("campaign_id", campaign.id)
      .eq("store_id", storeId)
      .eq("customer_phone", phone)
      .maybeSingle();

    if (customerError) throw customerError;

    if (!authorized) {
      return NextResponse.json({
        valid: false,
        message: "Este teléfono no está autorizado para esta promoción.",
      });
    }

    if (authorized.status !== "available") {
      return NextResponse.json({
        valid: false,
        message:
          authorized.status === "used"
            ? "Este teléfono ya utilizó el bono."
            : "El bono fue revocado para este teléfono.",
      });
    }

    const discountAmount = Math.min(
      Number(campaign.discount_amount || 0),
      Math.max(subtotal, 0)
    );

    return NextResponse.json({
      valid: true,
      message: `Bono aplicado: ahorras $${discountAmount.toFixed(2)}.`,
      campaignId: campaign.id,
      code: campaign.code,
      discountAmount,
      expiresAt: campaign.expires_at,
    });
  } catch (error) {
    console.error("VALIDATE DISCOUNT ERROR:", error);
    return NextResponse.json(
      { valid: false, message: "No se pudo validar el bono." },
      { status: 500 }
    );
  }
}
