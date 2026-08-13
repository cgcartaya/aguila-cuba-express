// Guardar en: app/api/admin/reminders/route.ts
//
// Panel de admin → Marketing → Recordatorios.
// GET: lista carritos abandonados y órdenes sin pagar de la tienda.
// POST: marca que un recordatorio se mandó por WhatsApp (el admin le dio
// clic al botón, ver components/admin/RemindersPanel.tsx).
//
// Mismo patrón de autorización que app/api/admin/pickups/manual-stop/route.ts:
// token de sesión de Supabase en el header Authorization, cualquier
// miembro activo de la tienda (o super_admin) puede ver y marcar —
// esto es solo visibilidad de marketing, no una acción destructiva.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const maxDuration = 30;

const clean = (value: unknown, max = 160) => String(value ?? "").trim().slice(0, max);
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function authorize(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { denied: fail("No se recibió la sesión.", 401) };

  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return { denied: fail("Sesión inválida.", 401) };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role,active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.active) return { denied: fail("Usuario inactivo.", 403) };
  if (profile.role === "super_admin") return { denied: null };

  const { data: membership } = await supabaseAdmin
    .from("store_users")
    .select("active")
    .eq("store_id", storeId)
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();

  if (!membership) return { denied: fail("No tienes acceso a esta tienda.", 403) };
  return { denied: null };
}

export async function GET(request: NextRequest) {
  const storeId = clean(request.nextUrl.searchParams.get("storeId"), 64);
  if (!storeId) return fail("Falta el id de la tienda.");

  const { denied } = await authorize(request, storeId);
  if (denied) return denied;

  const cutoffCartMinIdle = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const cutoffCartMaxAge = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const cutoffOrderMinPending = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const cutoffOrderMaxAge = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: carts, error: cartsError }, { data: orders, error: ordersError }] = await Promise.all([
    supabaseAdmin
      .from("checkout_abandonment")
      .select(
        "id, customer_name, customer_email, customer_phone, items, subtotal, method, last_seen_at, email_reminded_at, whatsapp_reminded_at"
      )
      .eq("store_id", storeId)
      .is("converted_at", null)
      .lte("last_seen_at", cutoffCartMinIdle)
      .gte("last_seen_at", cutoffCartMaxAge)
      .order("last_seen_at", { ascending: false })
      .limit(100),
    supabaseAdmin
      .from("orders")
      .select("id, order_number, customer_id, total, created_at, payment_method, email_reminded_at, whatsapp_reminded_at")
      .eq("store_id", storeId)
      .eq("payment_status", "pending")
      .is("deleted_at", null)
      .lte("created_at", cutoffOrderMinPending)
      .gte("created_at", cutoffOrderMaxAge)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (cartsError) console.error("Error listando carritos abandonados:", cartsError);
  if (ordersError) console.error("Error listando órdenes sin pagar:", ordersError);

  const customerIds = Array.from(new Set((orders || []).map((o) => o.customer_id).filter(Boolean)));
  const { data: customers } =
    customerIds.length > 0
      ? await supabaseAdmin.from("customers").select("id, name, email, phone").in("id", customerIds)
      : { data: [] as any[] };
  const customerById = new Map((customers || []).map((c) => [c.id, c]));

  const ordersWithCustomer = (orders || []).map((order) => ({
    ...order,
    customer: order.customer_id ? customerById.get(order.customer_id) || null : null,
  }));

  return NextResponse.json({
    ok: true,
    abandonedCarts: carts || [],
    unpaidOrders: ordersWithCustomer,
  });
}

export async function POST(request: NextRequest) {
  let body: { storeId?: string; kind?: "cart" | "order"; id?: string };

  try {
    body = await request.json();
  } catch {
    return fail("Cuerpo de la solicitud inválido.");
  }

  const storeId = clean(body.storeId, 64);
  const id = clean(body.id, 64);
  const kind = body.kind;

  if (!storeId || !id || (kind !== "cart" && kind !== "order")) {
    return fail("Faltan datos para marcar el recordatorio.");
  }

  const { denied } = await authorize(request, storeId);
  if (denied) return denied;

  const table = kind === "cart" ? "checkout_abandonment" : "orders";
  const storeColumn = kind === "cart" ? "store_id" : "store_id";

  const { error } = await supabaseAdmin
    .from(table)
    .update({ whatsapp_reminded_at: new Date().toISOString() })
    .eq("id", id)
    .eq(storeColumn, storeId);

  if (error) {
    console.error("Error marcando recordatorio de WhatsApp:", error);
    return fail("No se pudo marcar el recordatorio.", 500);
  }

  return NextResponse.json({ ok: true });
}
