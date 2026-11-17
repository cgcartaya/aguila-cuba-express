import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Legacy server APIs sometimes authorize any store membership. Resolve this
// account restriction through PostgreSQL with the caller's validated JWT, before
// those APIs can use their service-role clients. No cached/user-editable claims.
export async function lymApiBoundary(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    !path.startsWith("/api/") ||
    path.startsWith("/api/cron/") ||
    path === "/api/admin/lym"
  )
    return null;
  const authorization = request.headers.get("authorization");
  if (!authorization?.match(/^Bearer\s+\S+/i)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    return NextResponse.json(
      { error: "No se pudo verificar el acceso." },
      { status: 503 },
    );
  const db = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: limited, error } = await db.rpc("lym_api_limited");
  // Preserve the existing handler's behavior for an invalid JWT.
  if (error?.code === "PGRST301" || error?.code === "PGRST303") return null;
  if (error)
    return NextResponse.json(
      { error: "No se pudo verificar el acceso." },
      { status: 503 },
    );
  if (limited)
    return NextResponse.json(
      {
        error:
          "Tu cuenta solo permite gestionar productos, existencias y ventas de LYM.",
      },
      { status: 403 },
    );
  return null;
}
