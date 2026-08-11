import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function normalizeHost(value: string) {
  return value.replace(/^www\./, "").split(":")[0].toLowerCase().trim();
}

const getCachedCommercialPortalConfig = unstable_cache(
  async (requestedSlug: string, host: string) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return { status: 500, body: { error: "Supabase no configurado" } };

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const subdomain = host.endsWith(".perlamarketplace.com") ? host.replace(".perlamarketplace.com", "") : null;

    let storeQuery = supabase
      .from("stores")
      .select("id,name,slug,logo_url,primary_color,secondary_color,subdomain,domain,module_store_enabled")
      .eq("is_active", true);

    if (requestedSlug) storeQuery = storeQuery.eq("slug", requestedSlug);
    else if (subdomain) storeQuery = storeQuery.eq("subdomain", subdomain);
    else storeQuery = storeQuery.or(`domain.eq.${host},slug.eq.aguila`);

    const { data: store, error: storeError } = await storeQuery.limit(1).maybeSingle();
    if (storeError || !store) return { status: 404, body: { error: "Empresa no encontrada" } };

    const [settings, services, promotions, faqs, testimonials, quoteSettings] = await Promise.all([
      supabase.from("commercial_portal_settings").select("*").eq("store_id", store.id).maybeSingle(),
      supabase.from("commercial_portal_services").select("*").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("commercial_portal_promotions").select("*").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("commercial_portal_faqs").select("*").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("commercial_portal_testimonials").select("*").eq("store_id", store.id).eq("is_active", true).order("sort_order"),
      supabase.from("customer_portal_settings").select("is_enabled,quote_enabled,tracking_enabled,pickup_enabled").eq("store_id", store.id).maybeSingle(),
    ]);

    return {
      status: 200,
      body: {
        store,
        settings: settings.data,
        services: services.data || [],
        promotions: promotions.data || [],
        faqs: faqs.data || [],
        testimonials: testimonials.data || [],
        quoteSettings: quoteSettings.data,
      },
    };
  },
  ["commercial-portal-config-v2"],
  { revalidate: 300, tags: ["commercial-portal-config"] },
);

export async function GET(request: NextRequest) {
  const requestedSlug = request.nextUrl.searchParams.get("slug")?.trim() || "";
  const host = normalizeHost(request.headers.get("x-forwarded-host") || request.headers.get("host") || "");
  const result = await getCachedCommercialPortalConfig(requestedSlug, host);

  // La respuesta HTTP no se deja retenida en el CDN: la caché costosa vive
  // en Next Data Cache y puede invalidarse inmediatamente desde el admin.
  return NextResponse.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "no-store" },
  });
}
