import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

const WRITE_ROLES = new Set(["OWNER", "ADMIN"]);
const ALLOWED_SCOPES = new Set([
  "commercial-portal-config",
  "public-quote-config",
  "pickup-config",
  "payment-availability",
]);

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function access(request: NextRequest, storeId: string) {
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
    .select("role,active")
    .eq("store_id", storeId)
    .eq("user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();

  if (!membership) return { denied: fail("No tienes acceso a esta tienda.", 403) };
  if (!WRITE_ROLES.has(String(membership.role).toUpperCase())) {
    return { denied: fail("Solo el dueño o un admin puede invalidar esta caché.", 403) };
  }

  return { denied: null };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = String(body.store_id || "").trim();
  if (!storeId) return fail("store_id es obligatorio.");

  const { denied } = await access(request, storeId);
  if (denied) return denied;

  const requested: string[] = Array.isArray(body.scopes) ? body.scopes.map(String) : [];
  const scopes: string[] = requested.filter((scope) => ALLOWED_SCOPES.has(scope));
  if (!scopes.length) return fail("No se recibió un scope válido.");

  for (const scope of new Set(scopes)) {
    // expire: 0 fuerza que el próximo request vuelva a consultar la fuente,
    // en lugar de servir primero una copia stale.
    revalidateTag(scope, { expire: 0 });
  }

  return NextResponse.json({ ok: true, invalidated: [...new Set(scopes)] });
}
