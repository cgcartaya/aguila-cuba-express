import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashSquareState, obtainSquareTokens, squareConfig, verifySquareConnection } from "@/lib/payments/square";
import { canManageSquare, squareStateCookie, squareTokenFields } from "@/lib/services/square-admin";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const cookie = request.cookies.get(squareStateCookie)?.value;
  function finish(status: string) {
    const location = `/admin/settings/payments?square=${status}`;
    const response = new NextResponse(null, { status: 303, headers: {
      Location: location, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
    } });
    if (cookie === state) response.cookies.set(squareStateCookie, "", { path: "/", secure: true, httpOnly: true, sameSite: "lax", maxAge: 0 });
    return response;
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(state) || state !== cookie) return finish("invalid");
  try {
    const { data, error } = await supabaseAdmin.from("square_oauth_states").delete()
      .eq("state_hash", hashSquareState(state)).gt("expires_at", new Date().toISOString())
      .select("store_id,user_id,environment").maybeSingle();
    if (error || !data || !await canManageSquare(data.user_id, data.store_id)) return finish("invalid");
    if (request.nextUrl.searchParams.has("error")) return finish("cancelled");
    const code = request.nextUrl.searchParams.get("code");
    const environment = data.environment;
    if (!code || (environment !== "sandbox" && environment !== "production")) return finish("invalid");
    if (environment === "production" && process.env.SQUARE_ENABLE_PRODUCTION !== "true") return finish("invalid");
    if (new URL(squareConfig(environment).redirectUri).origin !== request.nextUrl.origin) return finish("invalid");
    const tokens = await obtainSquareTokens(environment, { code });
    const verified = await verifySquareConnection(environment, tokens);
    const { error: insertError } = await supabaseAdmin.from("store_square_settings").insert({
      store_id: data.store_id,
      environment,
      merchant_id: tokens.merchant_id,
      merchant_name: verified.merchantName,
      location_id: verified.locations.length === 1 ? verified.locations[0].id : null,
      ...squareTokenFields(data.store_id, environment, tokens),
    });
    if (insertError) throw insertError;
    return finish("connected");
  } catch {
    return finish("error");
  }
}
