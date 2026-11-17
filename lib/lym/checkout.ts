import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { resolveReceipt } from "@/lib/shareapp/server";

export async function createLymRequest(
  storeId: string,
  body: Record<string, unknown>,
) {
  const form = (body.form || {}) as Record<string, unknown>;
  const text = (key: string, max = 500) =>
    String(form[key] || "")
      .trim()
      .slice(0, max);
  const receipt = await resolveReceipt(storeId);
  const { data: order, error } = await db.rpc("lym_web_request", {
    p_store: storeId,
    p_request: String(body.requestKey || randomUUID()),
    p_payload: {
      customer_name: text("name", 150),
      customer_phone: text("phone", 40),
      recipient_name: text("recipient_name", 150),
      recipient_phone: text("recipient_phone", 40),
      address: text("exact_address"),
      delivery_place: text("delivery_place", 150),
      notes: text("notes", 2000),
    },
    p_items: body.items,
    p_attribution: receipt
      ? {
          member_id: receipt.memberId,
          link_id: receipt.linkId,
          visit_id: receipt.visitId,
          referred_at: new Date(receipt.issuedAt).toISOString(),
        }
      : null,
  });
  if (error) {
    console.error("LYM checkout:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error.code === "P0001"
            ? error.message
            : "No se pudo enviar la solicitud. Revisa los datos.",
      },
      { status: 400 },
    );
  }
  return NextResponse.json({
    success: true,
    order: {
      id: order.id,
      order_number: order.order_number,
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      delivery_fee: 0,
      platform_fee_amount: 0,
      discount_amount: 0,
      shipping_details: null,
      zelle_info: null,
    },
    requestOnly: true,
  });
}
