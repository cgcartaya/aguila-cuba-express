import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const WRITE_ROLES = new Set(["OWNER", "ADMIN"]);
const clean = (v: unknown, n = 500) => String(v ?? "").trim().slice(0, n);
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// Mismo patrón de autenticación que stripe-connect/route.ts.
async function access(request: NextRequest, storeId: string) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return { denied: fail("No se recibió la sesión.", 401) };
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user) return { denied: fail("Sesión inválida.", 401) };
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", data.user.id).maybeSingle();
  if (!profile?.active) return { denied: fail("Usuario inactivo.", 403) };
  if (profile.role === "super_admin") return { denied: null };
  const { data: membership } = await supabaseAdmin.from("store_users").select("role,active").eq("store_id", storeId).eq("user_id", data.user.id).eq("active", true).maybeSingle();
  if (!membership) return { denied: fail("No tienes acceso a esta tienda.", 403) };
  if (!WRITE_ROLES.has(String(membership.role).toUpperCase())) return { denied: fail("Solo el dueño o un admin puede cambiar esto.", 403) };
  return { denied: null };
}

// GET: estado actual del modo de cobro de la tienda. Nunca devuelve la
// secret key guardada — solo si hay una guardada o no (directConfigured).
export async function GET(request: NextRequest) {
  const storeId = clean(request.nextUrl.searchParams.get("store_id"), 64);
  if (!storeId) return fail("store_id es obligatorio.");
  const { denied } = await access(request, storeId);
  if (denied) return denied;

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .select("stripe_mode, stripe_direct_secret_key, stripe_direct_webhook_secret")
    .eq("id", storeId)
    .maybeSingle();

  if (error || !store) return fail("No se pudo consultar la tienda.", 500);

  return NextResponse.json({
    ok: true,
    mode: store.stripe_mode === "direct" ? "direct" : "connect",
    directConfigured: Boolean(store.stripe_direct_secret_key && store.stripe_direct_webhook_secret),
  });
}

// POST: guarda/actualiza la config del modo "direct" y/o cambia el modo
// activo de la tienda ("connect" <-> "direct"). Guardar una secret key
// nueva no borra la configuración de "connect" (stripe_account_id sigue
// intacto) — por eso se puede ir y volver entre los dos modos sin
// reconfigurar nada cada vez.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = clean(body.store_id, 64);
  if (!storeId) return fail("store_id es obligatorio.");
  const { denied } = await access(request, storeId);
  if (denied) return denied;

  const mode = body.mode === "direct" ? "direct" : body.mode === "connect" ? "connect" : null;
  const secretKey = body.secretKey !== undefined ? clean(body.secretKey, 300) : undefined;
  const webhookSecret = body.webhookSecret !== undefined ? clean(body.webhookSecret, 300) : undefined;

  if (!mode && secretKey === undefined && webhookSecret === undefined) {
    return fail("No hay nada que actualizar.");
  }

  const update: Record<string, unknown> = {};
  if (secretKey !== undefined) {
    if (secretKey && !secretKey.startsWith("sk_")) {
      return fail("Esa no parece una secret key de Stripe válida (debe empezar con sk_).");
    }
    update.stripe_direct_secret_key = secretKey || null;
  }
  if (webhookSecret !== undefined) {
    if (webhookSecret && !webhookSecret.startsWith("whsec_")) {
      return fail("Ese no parece un signing secret de webhook válido (debe empezar con whsec_).");
    }
    update.stripe_direct_webhook_secret = webhookSecret || null;
  }

  if (mode === "direct") {
    // Para activar "direct" tiene que quedar configurado, ya sea porque
    // se mandó ahora o porque ya estaba guardado de antes.
    const { data: current } = await supabaseAdmin
      .from("stores")
      .select("stripe_direct_secret_key, stripe_direct_webhook_secret")
      .eq("id", storeId)
      .maybeSingle();

    const willHaveSecretKey = update.stripe_direct_secret_key ?? current?.stripe_direct_secret_key;
    const willHaveWebhookSecret = update.stripe_direct_webhook_secret ?? current?.stripe_direct_webhook_secret;

    if (!willHaveSecretKey || !willHaveWebhookSecret) {
      return fail("Antes de activar el modo directo, guarda la secret key y el webhook secret de la cuenta de Stripe de la tienda.");
    }
    update.stripe_mode = "direct";
  }

  if (mode === "connect") {
    update.stripe_mode = "connect";
  }

  const { error } = await supabaseAdmin.from("stores").update(update).eq("id", storeId);
  if (error) return fail("No se pudo guardar.", 500);

  return NextResponse.json({ ok: true });
}
