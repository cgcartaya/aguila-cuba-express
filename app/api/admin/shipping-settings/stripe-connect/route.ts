import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripeV2Fetch } from "@/lib/services/stripe-admin";

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

// Traduce el status de la capability de Stripe v2 a nuestros 2 flags.
// "active" = puede cobrar. Cualquier otra cosa (pending/restricted/
// unsupported/ausente) la tratamos como "todavía no".
function readMerchantStatus(account: any) {
  const capability = account?.configuration?.merchant?.capabilities?.card_payments;
  const chargesEnabled = capability?.status === "active";
  // v2 no tiene un solo booleano "details_submitted" como v1: se infiere de
  // si ya no hay requisitos pendientes bloqueando la cuenta.
  const pendingRequirements = Array.isArray(account?.requirements?.entries) ? account.requirements.entries.length : 0;
  const detailsSubmitted = chargesEnabled || pendingRequirements === 0;
  return { chargesEnabled, detailsSubmitted };
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

  if (store.stripe_account_id) {
    try {
      const account = await stripeV2Fetch(
        `core/accounts/${store.stripe_account_id}?include[]=configuration.merchant&include[]=requirements`
      );
      const { chargesEnabled, detailsSubmitted } = readMerchantStatus(account);

      await supabaseAdmin
        .from("stores")
        .update({ stripe_charges_enabled: chargesEnabled, stripe_details_submitted: detailsSubmitted })
        .eq("id", storeId);

      return NextResponse.json({ ok: true, connected: true, chargesEnabled, detailsSubmitted });
    } catch (e) {
      // Si Stripe no responde, devolvemos lo último que sabíamos en vez de tronar.
      return NextResponse.json({
        ok: true,
        connected: true,
        chargesEnabled: store.stripe_charges_enabled,
        detailsSubmitted: store.stripe_details_submitted,
        warning: (e as Error).message,
      });
    }
  }

  return NextResponse.json({ ok: true, connected: false, chargesEnabled: false, detailsSubmitted: false });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const storeId = clean(body.store_id, 64);
  if (!storeId) return fail("store_id es obligatorio.");
  const { denied } = await access(request, storeId);
  if (denied) return denied;

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .select("id, name, stripe_account_id")
    .eq("id", storeId)
    .maybeSingle();
  if (error || !store) return fail("No se pudo consultar la tienda.", 500);

  let accountId = store.stripe_account_id;

  try {
    if (!accountId) {
      const account = await stripeV2Fetch("core/accounts", {
        method: "POST",
        body: {
          display_name: store.name,
          // "full" (no "express") porque Stripe exige fees_collector =
          // "application" cuando dashboard es "express". Con "full", cada
          // tienda conectada paga directo la comisión de Stripe, y tu %
          // de plataforma queda limpio, sin que tú tengas que cubrir nada.
          dashboard: "full",
          identity: { country: "us" },
          // Águila (la cuenta conectada) es quien absorbe el 2.9%+$0.30 de
          // Stripe por procesar tarjetas — así te lo expliqué en la tabla
          // de costos. Si prefieres que lo absorba la plataforma, cambia
          // "account" por "application" aquí.
          defaults: { responsibilities: { fees_collector: "stripe", losses_collector: "stripe" } },
          configuration: {
            merchant: { capabilities: { card_payments: { requested: true } } },
          },
          include: ["configuration.merchant"],
        },
      });
      accountId = account.id;
      await supabaseAdmin.from("stores").update({ stripe_account_id: accountId, stripe_connected_at: new Date().toISOString() }).eq("id", storeId);
    }

    const origin = request.headers.get("origin") || `https://${request.headers.get("host")}`;
    const accountLink = await stripeV2Fetch("core/account_links", {
      method: "POST",
      body: {
        account: accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["merchant"],
            refresh_url: `${origin}/admin/shipping/settings/pagos?refresh=1`,
            return_url: `${origin}/admin/shipping/settings/pagos?done=1`,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, url: accountLink.url });
  } catch (e) {
    return fail((e as Error).message, 500);
  }
}
