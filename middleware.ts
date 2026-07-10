import { NextRequest, NextResponse } from "next/server";

const PLATFORM_DOMAIN = "perlamarketplace.com";

function normalizeHost(host: string) {
  return host.replace(/^www\./, "").split(":")[0].toLowerCase().trim();
}

function shouldIgnorePath(pathname: string) {
  return (
    pathname.startsWith("/api") ||
    pathname.startsWith("/admin") ||
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

/**
 * Convierte las rutas antiguas visibles en URLs limpias cuando se navega
 * desde un subdominio de tienda.
 *
 * Ejemplos:
 * /tienda/dl-racing-cyber                 -> /
 * /tienda/dl-racing-cyber/producto/123    -> /producto/123
 * /tienda/producto/123                    -> /producto/123
 * /tienda/cart                            -> /cart
 */
function getCanonicalSubdomainPath(pathname: string, storeSlug: string) {
  const slugBase = `/tienda/${storeSlug}`;

  if (pathname === slugBase || pathname === "/tienda") {
    return "/";
  }

  if (pathname.startsWith(`${slugBase}/`)) {
    const cleanPath = pathname.slice(slugBase.length);
    return cleanPath || "/";
  }

  if (pathname.startsWith("/tienda/")) {
    const cleanPath = pathname.slice("/tienda".length);
    return cleanPath || "/";
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldIgnorePath(pathname)) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  if (!subdomain) {
    return NextResponse.next();
  }

  const slug = await getStoreSlugBySubdomain(subdomain);

  if (!slug) {
    return NextResponse.next();
  }

  // 1. Si un enlace antiguo manda al usuario a /tienda..., limpiamos la URL.
  //    Esto evita que el navegador muestre /tienda/dl-racing-cyber en el subdominio.
  const canonicalPath = getCanonicalSubdomainPath(pathname, slug);

  if (canonicalPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = canonicalPath;
    return NextResponse.redirect(redirectUrl, 308);
  }

  // 2. Reescritura interna: la URL pública queda limpia, pero Next.js renderiza
  //    las rutas existentes bajo /tienda/[slug].
  const rewriteUrl = request.nextUrl.clone();
  const cleanPath = pathname === "/" ? "" : pathname;

  rewriteUrl.pathname = `/tienda/${slug}${cleanPath}`;

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
