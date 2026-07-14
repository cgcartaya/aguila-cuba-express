import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const VALID_DAYS = new Set([7, 30, 90]);

async function canAccessStore(userId: string, storeId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role,active")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.active) return false;
  if (profile.role === "super_admin") return true;

  const { data: membership } = await supabaseAdmin
    .from("store_users")
    .select("id")
    .eq("user_id", userId)
    .eq("store_id", storeId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  return Boolean(membership);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
    }

    const storeId = request.nextUrl.searchParams.get("storeId") || "";
    const requestedDays = Number(request.nextUrl.searchParams.get("days") || 30);
    const days = VALID_DAYS.has(requestedDays) ? requestedDays : 30;

    if (!storeId || !(await canAccessStore(authData.user.id, storeId))) {
      return NextResponse.json({ error: "Sin acceso a esta tienda." }, { status: 403 });
    }

    const from = new Date();
    from.setUTCHours(0, 0, 0, 0);
    from.setUTCDate(from.getUTCDate() - (days - 1));

    const { data, error } = await supabaseAdmin
      .from("site_visits")
      .select("visitor_id,session_id,path,page_type,product_id,source,device_type,created_at,products(name)")
      .eq("store_id", storeId)
      .gte("created_at", from.toISOString())
      .order("created_at", { ascending: true });

    if (error) throw error;

    const visits = data || [];
    const todayKey = new Date().toISOString().slice(0, 10);
    const dailyMap = new Map<string, number>();
    const pageMap = new Map<string, number>();
    const productMap = new Map<string, { name: string; visits: number }>();
    const sourceMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();

    for (let i = 0; i < days; i++) {
      const date = new Date(from);
      date.setUTCDate(from.getUTCDate() + i);
      dailyMap.set(date.toISOString().slice(0, 10), 0);
    }

    visits.forEach((visit: any) => {
      const dateKey = String(visit.created_at).slice(0, 10);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
      pageMap.set(visit.path, (pageMap.get(visit.path) || 0) + 1);
      sourceMap.set(visit.source || "direct", (sourceMap.get(visit.source || "direct") || 0) + 1);
      deviceMap.set(visit.device_type || "unknown", (deviceMap.get(visit.device_type || "unknown") || 0) + 1);

      if (visit.product_id) {
        const product = Array.isArray(visit.products) ? visit.products[0] : visit.products;
        const current = productMap.get(visit.product_id) || {
          name: product?.name || "Producto eliminado",
          visits: 0,
        };
        current.visits += 1;
        productMap.set(visit.product_id, current);
      }
    });

    const uniqueVisitors = new Set(visits.map((v: any) => v.visitor_id).filter(Boolean)).size;
    const uniqueSessions = new Set(visits.map((v: any) => v.session_id).filter(Boolean)).size;

    return NextResponse.json({
      rangeDays: days,
      totals: {
        visits: visits.length,
        today: dailyMap.get(todayKey) || 0,
        uniqueVisitors,
        sessions: uniqueSessions,
      },
      daily: Array.from(dailyMap, ([date, count]) => ({ date, count })),
      topPages: Array.from(pageMap, ([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topProducts: Array.from(productMap, ([id, value]) => ({ id, ...value }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10),
      sources: Array.from(sourceMap, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      devices: Array.from(deviceMap, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    console.error("ANALYTICS SUMMARY ERROR:", error);
    return NextResponse.json({ error: "No se pudieron cargar las estadísticas." }, { status: 500 });
  }
}
