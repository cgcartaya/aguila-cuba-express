// Guardar en: app/api/admin/reviews/route.ts
//
// Panel de admin → Productos → Reseñas.
// GET: lista las reseñas de la tienda (pending primero).
// POST: aprueba / rechaza / borra una reseña.
//
// Mismo patrón de autorización que app/api/admin/reminders/route.ts:
// token de sesión de Supabase en el header Authorization, cualquier
// miembro activo de la tienda (o super_admin) puede moderar.

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

  const { data: reviews, error } = await supabaseAdmin
    .from("product_reviews")
    .select(
      "id, product_id, customer_name, customer_phone, rating, comment, status, created_at, moderated_at"
    )
    .eq("store_id", storeId)
    .order("status", { ascending: true }) // 'approved' < 'pending' < 'rejected' alfabético — reordenamos abajo
    .order("created_at", { ascending: false });

  if (error) return fail("No se pudieron cargar las reseñas.", 500);

  const productIds = Array.from(new Set((reviews || []).map((r) => r.product_id)));

  // Consulta aparte en vez de un select con relación embebida — mismo
  // criterio que remembered-profile/route.ts: más seguro traer plano y
  // juntar acá que confiar en que PostgREST detecte la FK.
  const { data: products } =
    productIds.length > 0
      ? await supabaseAdmin.from("products").select("id, name").in("id", productIds)
      : { data: [] as { id: string; name: string }[] };

  const nameByProductId = new Map((products || []).map((p) => [p.id, p.name]));

  const pendingFirst = ["pending", "approved", "rejected"];
  const sorted = [...(reviews || [])].sort(
    (a, b) => pendingFirst.indexOf(a.status) - pendingFirst.indexOf(b.status)
  );

  return NextResponse.json({
    ok: true,
    reviews: sorted.map((r) => ({
      ...r,
      product_name: nameByProductId.get(r.product_id) || "Producto",
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = clean(body.storeId, 64);
  const id = clean(body.id, 64);
  const action = clean(body.action, 20);

  if (!storeId || !id) return fail("Faltan datos.");
  if (!["approve", "reject", "delete"].includes(action)) return fail("Acción inválida.");

  const { denied } = await authorize(request, storeId);
  if (denied) return denied;

  if (action === "delete") {
    const { error } = await supabaseAdmin
      .from("product_reviews")
      .delete()
      .eq("id", id)
      .eq("store_id", storeId);

    if (error) return fail("No se pudo borrar la reseña.", 500);
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseAdmin
    .from("product_reviews")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      moderated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("store_id", storeId);

  if (error) return fail("No se pudo actualizar la reseña.", 500);
  return NextResponse.json({ ok: true });
}
