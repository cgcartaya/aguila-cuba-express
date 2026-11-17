import "server-only";
import { supabaseAdmin as db } from "@/lib/supabase-admin";
export { db };
export async function saasActor(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await db
    .from("profiles")
    .select("role,active")
    .eq("id", data.user.id)
    .maybeSingle();
  return profile?.active && profile.role === "super_admin"
    ? data.user.id
    : null;
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
// Supabase otherwise silently truncates lists at the configured API row limit.
export async function allRows(table: string, order: string) {
  const result: Record<string, unknown>[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .order(order)
      .order(order === "store_id" ? "store_id" : "id")
      .range(start, start + 499);
    if (error) throw error;
    result.push(...data);
    if (data.length < 500) return result;
  }
}
