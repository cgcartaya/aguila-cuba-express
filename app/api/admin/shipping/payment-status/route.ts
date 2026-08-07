import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getReceiptByShipmentId } from "@/lib/services/receipts";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function access(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return fail("No se recibió la sesión.", 401);
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return fail("Sesión inválida.", 401);
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return fail("Usuario inactivo.", 403);
  if (profile.role === "super_admin") return null;
  const { data: membership } = await supabaseAdmin.from("store_users").select("active").eq("store_id", storeId).eq("user_id", data.user.id).eq("active", true).maybeSingle();
  if (!membership) return fail("No tienes acceso a esta tienda.", 403);
  return null;
}

export async function GET(request: NextRequest) {
  const shipmentId = String(request.nextUrl.searchParams.get("shipmentId") || "").trim();
  if (!shipmentId) return fail("Falta el envío.");

  const { data: shipment, error } = await supabaseAdmin
    .from("shipments")
    .select("id, store_id, tracking_code, payment_status, service_price")
    .eq("id", shipmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !shipment) return fail("Envío no encontrado.", 404);

  const denied = await access(request, shipment.store_id);
  if (denied) return denied;

  const { data: receipt } = await getReceiptByShipmentId(
    shipmentId,
    shipment.store_id
  );

  return NextResponse.json({
    ok: true,
    trackingCode: shipment.tracking_code,
    paymentStatus: shipment.payment_status,
    servicePrice: shipment.service_price,
    folio: receipt?.folio || null,
  });
}
