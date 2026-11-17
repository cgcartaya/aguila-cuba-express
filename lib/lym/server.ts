import { supabaseAdmin as db } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export { db };
export class LymError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function lymAccess(request: Request, storeId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(storeId)) throw new LymError("Tienda inválida.");
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) throw new LymError("Inicia sesión.", 401);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new LymError("Sesión inválida.", 401);
  const [
    { data: profile, error: pe },
    { data: store, error: se },
    { data: member, error: me },
  ] = await Promise.all([
    db
      .from("profiles")
      .select("active,role")
      .eq("id", data.user.id)
      .maybeSingle(),
    db
      .from("stores")
      .select("id,name,slug,logo_url,is_active,module_store_enabled")
      .eq("id", storeId)
      .eq("slug", "lym")
      .maybeSingle(),
    db
      .from("store_users")
      .select("role,active")
      .eq("store_id", storeId)
      .eq("user_id", data.user.id)
      .maybeSingle(),
  ]);
  if (pe || se || me)
    throw new LymError("No se pudo verificar el acceso.", 500);
  const owner =
    profile?.active &&
    (profile.role === "super_admin" ||
      (member?.active && ["OWNER", "ADMIN"].includes(member.role)));
  if (
    !profile?.active ||
    !store?.is_active ||
    !store.module_store_enabled ||
    (!owner && !(member?.active && member.role === "LYM_SALES"))
  )
    throw new LymError("Sin acceso a ventas de LYM.", 403);
  return { actor: data.user.id, owner: Boolean(owner), store };
}
export function lymFailure(error: unknown) {
  if (error instanceof SyntaxError)
    return NextResponse.json(
      { error: "Solicitud JSON inválida." },
      { status: 400 },
    );
  if (error instanceof LymError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  console.error("LYM:", error);
  return NextResponse.json(
    { error: "No se pudo completar la operación de LYM." },
    { status: 500 },
  );
}
export const lymJson = (data: unknown) =>
  NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
