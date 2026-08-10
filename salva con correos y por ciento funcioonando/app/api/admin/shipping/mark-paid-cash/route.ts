import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createPaymentReceipt } from "@/lib/services/receipts";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// Mismo patrón de autenticación que el resto de app/api/admin/*, pero sin
// restringir por rol: cualquier miembro activo de la tienda puede cobrar
// en efectivo durante una recogida (no solo OWNER/ADMIN).
async function access(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { denied: fail("No se recibió la sesión.", 401), userId: null as string | null };
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return { denied: fail("Sesión inválida.", 401), userId: null };
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return { denied: fail("Usuario inactivo.", 403), userId: null };
  if (profile.role === "super_admin") return { denied: null, userId: data.user.id };
  const { data: membership } = await supabaseAdmin.from("store_users").select("active").eq("store_id", storeId).eq("user_id", data.user.id).eq("active", true).maybeSingle();
  if (!membership) return { denied: fail("No tienes acceso a esta tienda.", 403), userId: null };
  return { denied: null, userId: data.user.id };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const shipmentId = String(body.shipmentId || "").trim();
  if (!shipmentId) return fail("Falta el envío.");

  const { data: shipment, error: shipmentError } = await supabaseAdmin
    .from("shipments")
    .select("id, store_id, service_price, balance_due, payment_status")
    .eq("id", shipmentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (shipmentError || !shipment) return fail("Envío no encontrado.", 404);

  const { denied, userId } = await access(request, shipment.store_id);
  if (denied) return denied;

  if (shipment.payment_status === "paid") {
    return fail("Este envío ya está marcado como pagado.");
  }

  // Lo que se cobra AHORA en efectivo es el saldo pendiente, no
  // necesariamente el total de la factura — puede haber un pago parcial
  // anterior (efectivo o tarjeta).
  const amountCollectedNow = Number(shipment.balance_due || 0);

  const { error: updateError } = await supabaseAdmin
    .from("shipments")
    .update({
      amount_paid: shipment.service_price,
      balance_due: 0,
      payment_status: "paid",
      payment_method: "cash",
    })
    .eq("id", shipmentId)
    .eq("store_id", shipment.store_id)
    .is("deleted_at", null);

  if (updateError) return fail("No se pudo marcar el envío como pagado.", 500);

  const { data: receipt, error: receiptError } = await createPaymentReceipt({
    storeId: shipment.store_id,
    shipmentId: shipment.id,
    amount: amountCollectedNow,
    paymentMethod: "cash",
    createdBy: userId,
  });

  if (receiptError) {
    // El envío ya quedó marcado como pagado; el recibo es un plus — no
    // tumbamos la respuesta si falla, pero sí avisamos.
    return NextResponse.json({ ok: true, folio: null, warning: "Pagado, pero no se pudo generar el recibo. Avisa para revisarlo." });
  }

  return NextResponse.json({ ok: true, folio: receipt?.folio || null });
}
