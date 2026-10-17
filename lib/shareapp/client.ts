"use client";
import { supabase } from "@/lib/supabase";
import { gestorAuth } from "./auth-client";
export async function shareappApi<T>(
  path: string,
  body?: unknown,
  method = "POST",
  sessionClient = supabase,
): Promise<T> {
  const { data } = await sessionClient.auth.getSession();
  if (!data.session) throw new Error("Inicia sesión para continuar.");
  const response = await fetch(`/api/shareapp/${path}`, {
    method: body ? method : "GET",
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "No se pudo completar la operación.");
  return result as T;
}
export type Result = {
  member_id: string;
  display_name: string;
  visits: number;
  product_views: number;
  orders: number;
  paid_orders: number;
  paid_total: number;
};
export type Member = {
  id: string;
  display_name: string;
  email?: string | null;
  password_pending?: boolean;
  active: boolean;
  user_id: string | null;
  invite_code: string | null;
  invite_expires_at: string | null;
};

export const gestorApi = <T>(path: string, body?: unknown, method = "POST") =>
  shareappApi<T>(path, body, method, gestorAuth);
export async function publicShareappApi<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`/api/shareapp/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la operación.");
  return data as T;
}
export type Identity = {
  id: string;
  email: string;
  fullName: string;
  passwordPending: boolean;
};
