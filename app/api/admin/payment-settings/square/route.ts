import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSquareState, hashSquareState, squareConfig, squareRequest, squareScopes } from "@/lib/payments/square";
import { getCloverSettings } from "@/lib/services/clover-admin";
import { getStoreStripeContext } from "@/lib/services/stripe-admin";
import { squareCheckoutAvailable } from "@/lib/services/square-checkout";
import { canManageSquare, readSquareSettings, squareStateCookie, verifyStoredSquareConnection } from "@/lib/services/square-admin";

const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const validStore = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);

async function authorize(request: NextRequest, storeId: string) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return null;
  const { data } = await supabaseAdmin.auth.getUser(token);
  if (!data.user || !await canManageSquare(data.user.id, storeId)) return null;
  return data.user.id;
}

export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get("store_id");
  if (!validStore(storeId)) return reply({ error: "Tienda inválida." }, 400);
  if (!await authorize(request, storeId)) return reply({ error: "Acceso denegado." }, 403);
  try {
    const settings = await readSquareSettings(storeId);
    const { data: store, error } = await supabaseAdmin.from("stores")
      .select("active_payment_provider").eq("id", storeId).single();
    if (error) throw error;
    const { data: reviews, error: reviewError } = await supabaseAdmin.from("square_payment_sessions")
      .select("order_id,payment_id,amount_cents,created_at").eq("store_id", storeId)
      .eq("status", "review").order("created_at", { ascending: false }).limit(20);
    if (reviewError) throw reviewError;
    return reply({ provider: store.active_payment_provider, reviews, connection: settings && {
      environment: settings.environment,
      merchantId: settings.merchant_id,
      merchantName: settings.merchant_name,
      locationId: settings.location_id,
      lastVerifiedAt: settings.last_verified_at,
      status: settings.connection_status,
    } });
  } catch {
    return reply({ error: "No se pudo consultar Square." }, 503);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const storeId: unknown = body?.store_id;
  if (!validStore(storeId)) return reply({ error: "Tienda inválida." }, 400);
  const userId = await authorize(request, storeId);
  if (!userId) return reply({ error: "Acceso denegado." }, 403);
  try {
    const settings = await readSquareSettings(storeId);
    if (body.action === "connect") {
      if (settings) return reply({ error: "La tienda ya tiene una cuenta Square." }, 409);
      const environment = body.environment;
      if (environment !== "sandbox" && environment !== "production") return reply({ error: "Entorno inválido." }, 400);
      if (environment === "production" && process.env.SQUARE_ENABLE_PRODUCTION !== "true") {
        return reply({ error: "Square Production aún no está habilitado." }, 409);
      }
      const config = squareConfig(environment);
      if (new URL(config.redirectUri).origin !== request.nextUrl.origin) {
        return reply({ error: "Abre Ajustes desde el dominio administrativo de Square." }, 409);
      }
      const state = createSquareState();
      const expires = new Date(Date.now() + 10 * 60_000);
      const { error } = await supabaseAdmin.from("square_oauth_states").insert({
        state_hash: hashSquareState(state), store_id: storeId, user_id: userId, environment, expires_at: expires.toISOString(),
      });
      if (error) throw error;
      const url = new URL("/oauth2/authorize", config.base);
      url.search = new URLSearchParams({
        client_id: config.applicationId, scope: squareScopes.join(" "), state, redirect_uri: config.redirectUri,
      }).toString();
      const response = reply({ url: url.toString() });
      response.cookies.set(squareStateCookie, state, { path: "/", secure: true, httpOnly: true, sameSite: "lax", expires });
      return response;
    }

    if (body.action === "provider") {
      const provider = body.provider;
      if (provider !== null && !["stripe", "clover", "square"].includes(provider)) {
        return reply({ error: "Pasarela inválida." }, 400);
      }
      const { data: store, error } = await supabaseAdmin.from("stores")
        .select("slug,stripe_mode,stripe_account_id,stripe_charges_enabled,stripe_direct_secret_key").eq("id", storeId).single();
      if (error || !store) throw new Error("No se pudo verificar la tienda.");
      if (store.slug === "lym") return reply({ error: "Esta tienda opera sin cobros en línea." }, 409);
      if (provider === "square") {
        if (!settings || !await squareCheckoutAvailable(storeId)) return reply({ error: "Completa la configuración de Square." }, 409);
        const verified = await verifyStoredSquareConnection(storeId, settings);
        if (!verified.locations.some(({ id }) => id === settings.location_id)) return reply({ error: "La ubicación Square dejó de estar disponible." }, 409);
      }
      if (provider === "stripe" && !getStoreStripeContext(store)) return reply({ error: "Completa la configuración de Stripe." }, 409);
      if (provider === "clover") {
        const clover = await getCloverSettings(storeId);
        if (!clover?.enabled || !clover.private_token || !clover.webhook_secret) return reply({ error: "Completa la configuración de Clover." }, 409);
      }
      const { data, error: updateError } = await supabaseAdmin.rpc("set_store_checkout_provider", { p_store_id: storeId, p_provider: provider });
      if (updateError || !data) throw new Error("No se pudo cambiar la pasarela.");
      revalidateTag("payment-availability", { expire: 0 });
      return reply({ provider });
    }
    if (!settings) return reply({ error: "Conecta una cuenta Square primero." }, 409);
    if (body.action === "disconnect") {
      const { data: canDisconnect, error: lockError } = await supabaseAdmin.rpc("begin_square_disconnect", {
        p_store_id: storeId, p_merchant_id: settings.merchant_id, p_environment: settings.environment,
      });
      if (lockError) throw lockError;
      if (!canDisconnect) return reply({ error: "Cambia de pasarela y concilia los cobros Square pendientes antes de desconectar." }, 409);
      const config = squareConfig(settings.environment);
      const revoked = await squareRequest<{ success: boolean }>(settings.environment, "/oauth2/revoke", {
        method: "POST",
        authorization: `Client ${config.applicationSecret}`,
        body: { client_id: config.applicationId, merchant_id: settings.merchant_id },
      });
      if (!revoked.success) throw new Error("Square no confirmó la revocación.");
      const { error } = await supabaseAdmin.from("store_square_settings").delete()
        .eq("store_id", storeId).eq("merchant_id", settings.merchant_id).eq("environment", settings.environment);
      if (error) throw error;
      return reply({ disconnected: true });
    }
    if (settings.connection_status !== "connected") return reply({ error: "La desconexión Square está en curso." }, 409);
    if (body.action !== "verify" && body.action !== "location") return reply({ error: "Acción inválida." }, 400);
    const result = await verifyStoredSquareConnection(storeId, settings);
    const locationId = body.action === "location" ? body.locationId : settings.location_id;
    const selected = result.locations.find((location) => location.id === locationId);
    if (body.action === "location" && !selected) return reply({ error: "Ubicación Square inválida." }, 400);
    const { data, error } = await supabaseAdmin.from("store_square_settings")
      .update({ merchant_name: result.merchantName, location_id: selected?.id ?? null, last_verified_at: new Date().toISOString() })
      .eq("store_id", storeId).eq("merchant_id", settings.merchant_id).eq("environment", settings.environment)
      .select("store_id").maybeSingle();
    if (error || !data) throw new Error("La conexión Square cambió.");
    revalidateTag("payment-availability", { expire: 0 });
    return reply({ locations: result.locations.map(({ id, name }) => ({ id, name })) });
  } catch {
    return reply({ error: "No se pudo completar la operación con Square." }, 503);
  }
}
