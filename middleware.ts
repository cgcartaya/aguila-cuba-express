import { NextRequest, NextResponse } from "next/server";

const PLATFORM_DOMAIN = "perlamarketplace.com";

function normalizeHost(host: string) {
  return host.replace(/^www\./, "").split(":")[0].toLowerCase().trim();
}

function shouldIgnorePath(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/manifest") ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  );
}

function getSubdomain(host: string) {
  const cleanHost = normalizeHost(host);

  if (!cleanHost.endsWith(`.${PLATFORM_DOMAIN}`)) return null;

  const subdomain = cleanHost.replace(`.${PLATFORM_DOMAIN}`, "").trim();

  if (!subdomain || subdomain === "www") return null;

  return subdomain;
}

async function getStoreSlugBySubdomain(subdomain: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;

  const url = new URL(`${supabaseUrl}/rest/v1/stores`);
  url.searchParams.set("select", "slug");
  url.searchParams.set("subdomain", `eq.${subdomain}`);
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    next: {
      revalidate: 60,
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as Array<{ slug?: string }>;

  return data?.[0]?.slug || null;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  /*
   * Rutas globales:
   * /login y /admin no pertenecen a la tienda pública y nunca deben
   * reescribirse como /tienda/[slug]/login o /tienda/[slug]/admin.
   */
  if (shouldIgnorePath(pathname)) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  if (!subdomain) {
    return NextResponse.next();
  }

  // Evita duplicar rutas internas que ya comienzan por /tienda.
  if (pathname.startsWith("/tienda")) {
    return NextResponse.next();
  }

  const slug = await getStoreSlugBySubdomain(subdomain);

  if (!slug) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const cleanPath = pathname === "/" ? "" : pathname;

  url.pathname = `/tienda/${slug}${cleanPath}`;
  url.search = search;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
