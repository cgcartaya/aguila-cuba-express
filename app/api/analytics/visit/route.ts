import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const BOT_PATTERN = /bot|crawler|spider|slurp|facebookexternalhit|whatsapp|telegrambot|preview/i;
const ALLOWED_PAGE_TYPES = new Set(["store", "product", "combo", "category", "other"]);

function detectDevice(userAgent: string) {
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  if (/mobile|iphone|android/i.test(userAgent)) return "mobile";
  return "desktop";
}

function detectSource(referrer?: string | null) {
  if (!referrer) return "direct";
  const value = referrer.toLowerCase();
  if (value.includes("google.")) return "google";
  if (value.includes("facebook.") || value.includes("fb.com")) return "facebook";
  if (value.includes("instagram.")) return "instagram";
  if (value.includes("whatsapp.")) return "whatsapp";
  if (value.includes("tiktok.")) return "tiktok";
  return "referral";
}

function safeText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  try {
    const userAgent = request.headers.get("user-agent") || "";
    if (!userAgent || BOT_PATTERN.test(userAgent)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const body = await request.json();
    const storeId = safeText(body.storeId, 80);
    const visitorId = safeText(body.visitorId, 100);
    const sessionId = safeText(body.sessionId, 100);
    const path = safeText(body.path, 500);
    const pageType = ALLOWED_PAGE_TYPES.has(body.pageType) ? body.pageType : "other";
    const productId = safeText(body.productId, 80) || null;
    const comboId = safeText(body.comboId, 80) || null;
    const referrer = safeText(body.referrer, 1000) || null;

    if (!storeId || !visitorId || !sessionId || !path || !path.startsWith("/")) {
      return NextResponse.json({ error: "Datos de visita inválidos." }, { status: 400 });
    }

    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("id,is_active")
      .eq("id", storeId)
      .eq("is_active", true)
      .maybeSingle();

    if (!store) {
      return NextResponse.json({ error: "Tienda no válida." }, { status: 404 });
    }

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("site_visits")
      .select("id")
      .eq("store_id", storeId)
      .eq("session_id", sessionId)
      .eq("path", path)
      .gte("created_at", oneMinuteAgo)
      .limit(1)
      .maybeSingle();

    if (recent) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const { error } = await supabaseAdmin.from("site_visits").insert({
      store_id: storeId,
      visitor_id: visitorId,
      session_id: sessionId,
      path,
      page_type: pageType,
      product_id: productId,
      combo_id: comboId,
      referrer,
      source: detectSource(referrer),
      device_type: detectDevice(userAgent),
      user_agent: userAgent.slice(0, 1000),
    });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ANALYTICS VISIT ERROR:", error);
    return NextResponse.json({ error: "No se pudo registrar la visita." }, { status: 500 });
  }
}
