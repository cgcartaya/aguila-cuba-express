import { supabaseAdmin } from "@/lib/supabase-admin";
import { decryptSquareToken, encryptSquareToken, obtainSquareTokens, verifySquareConnection } from "@/lib/payments/square";
import type { SquareEnvironment, SquareTokens } from "@/lib/payments/square";

export async function canManageSquare(userId: string, storeId: string) {
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,active").eq("id", userId).maybeSingle();
  if (!profile?.active) return false;
  if (profile.role === "super_admin") return true;
  const { data: membership } = await supabaseAdmin.from("store_users").select("role").eq("store_id", storeId)
    .eq("user_id", userId).eq("active", true).maybeSingle();
  return ["OWNER", "ADMIN"].includes(String(membership?.role).toUpperCase());
}

export const squareStateCookie = "__Host-square-oauth";

export async function readSquareSettings(storeId: string) {
  const { data, error } = await supabaseAdmin.from("store_square_settings").select("*").eq("store_id", storeId).maybeSingle();
  if (error) throw new Error("No se pudo leer la conexión Square.");
  return data as {
    environment: SquareEnvironment;
    merchant_id: string;
    merchant_name: string | null;
    location_id: string | null;
    access_token_encrypted: string;
    refresh_token_encrypted: string;
    token_expires_at: string;
    last_verified_at: string;
    connection_status: "connected" | "disconnecting";
  } | null;
}

export function squareTokenFields(storeId: string, environment: SquareEnvironment, tokens: SquareTokens) {
  const context = `${storeId}:${environment}:${tokens.merchant_id}`;
  return {
    access_token_encrypted: encryptSquareToken(tokens.access_token, `${context}:access`),
    refresh_token_encrypted: encryptSquareToken(tokens.refresh_token, `${context}:refresh`),
    token_expires_at: tokens.expires_at,
  };
}

export async function squareAccessToken(storeId: string, settings: NonNullable<Awaited<ReturnType<typeof readSquareSettings>>>) {
  const context = `${storeId}:${settings.environment}:${settings.merchant_id}`;
  if (Date.parse(settings.token_expires_at) > Date.now() + 7 * 86400_000) {
    return decryptSquareToken(settings.access_token_encrypted, `${context}:access`);
  }
  const refreshToken = decryptSquareToken(settings.refresh_token_encrypted, `${context}:refresh`);
  const tokens = await obtainSquareTokens(settings.environment, { refreshToken });
  if (tokens.merchant_id !== settings.merchant_id) throw new Error("El comercio Square cambió.");
  const { data, error } = await supabaseAdmin.from("store_square_settings")
    .update(squareTokenFields(storeId, settings.environment, tokens))
    .eq("store_id", storeId).eq("access_token_encrypted", settings.access_token_encrypted)
    .select("store_id").maybeSingle();
  if (error) throw new Error("No se pudo renovar Square.");
  if (data) return tokens.access_token;
  const current = await readSquareSettings(storeId);
  if (!current || current.merchant_id !== settings.merchant_id || current.environment !== settings.environment) {
    throw new Error("La conexión Square cambió.");
  }
  return decryptSquareToken(current.access_token_encrypted, `${context}:access`);
}

export async function verifyStoredSquareConnection(storeId: string, settings: NonNullable<Awaited<ReturnType<typeof readSquareSettings>>>) {
  const accessToken = await squareAccessToken(storeId, settings);
  return verifySquareConnection(settings.environment, { access_token: accessToken, merchant_id: settings.merchant_id });
}
