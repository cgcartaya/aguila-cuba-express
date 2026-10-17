"use client";
import { supabase } from "@/lib/supabase";
export async function shareappApi<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const { data } = await supabase.auth.getSession();
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
  active: boolean;
  user_id: string | null;
  invite_code: string | null;
  invite_expires_at: string | null;
};
