import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireStripe } from "@/lib/services/stripe-admin";

const WRITE_ROLES = new Set(["OWNER", "ADMIN"]);
const clean = (v: unknown, n = 120) => String(v ?? "").trim().slice(0, n);
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

// Mismo patrón de autenticación que el resto de app/api/admin/*.
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
  if (!WRITE_ROLES.has(String(membership.role).toUpperCase())) return { denied: fail("Solo el dueño o un admin puede conectar Stripe.", 403) };
  return { denied: null };
}

export async function GET(request: NextRequest) {
  const storeId = clean(request.nextUrl.searchParams.get("store_id"), 64);
  if (!storeId) return fail("store_id es obligatorio.");
  const { denied } = await access(request, storeId);
  if (denied) return denied;

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .select("stripe_account_id, stripe_charges_enabled, stripe_details_submitted, stripe_connected_at")
    .eq("id", storeId)
    .maybeSingle();

  if (error || !store) return fail("No se pudo consultar la tienda.", 500);

  // Si ya hay cuenta conectada, refresca el estado real desde Stripe
  // (por si el onboarding se completó después del último webhook).
  if (store.stripe_account_id) {
    try {
      const stripe = requireStripe();
      const account = await stripe.accounts.retrieve(store.stripe_account_id);
      await supabaseAdmin
        .from("stores")
        .update({
          stripe_charges_enabled: account.charges_enabled,
          stripe_details_submitted: account.details_submitted,
        })
        .eq("id", storeId);

      return NextResponse.json({
        ok: true,
        connected: true,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch {
      // Si Stripe no está configurado o falla, devolvemos lo que hay en BD.
    }
  }

  return NextResponse.json({
    ok: true,
    connected: Boolean(store.stripe_account_id),
    chargesEnabled: store.stripe_charges_enabled,
    detailsSubmitted: store.stripe_details_submitted,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = clean(body.store_id, 64);
  if (!storeId) return fail("store_id es obligatorio.");
  const { denied } = await access(request, storeId);
  if (denied) return denied;

  let stripe;
  try {
    stripe = requireStripe();
  } catch (e) {
    return fail((e as Error).message, 500);
  }

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .select("id, name, stripe_account_id")
    .eq("id", storeId)
    .maybeSingle();
  if (error || !store) return fail("No se pudo consultar la tienda.", 500);

  let accountId = store.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      business_type: "company",
      company: { name: store.name },
      metadata: { store_id: storeId },
    });
    accountId = account.id;
    await supabaseAdmin.from("stores").update({ stripe_account_id: accountId, stripe_connected_at: new Date().toISOString() }).eq("id", storeId);
  }

  const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/admin/shipping/settings/pagos?refresh=1`,
    return_url: `${origin}/admin/shipping/settings/pagos?done=1`,
    type: "account_onboarding",
  });

  return NextResponse.json({ ok: true, url: accountLink.url });
}
