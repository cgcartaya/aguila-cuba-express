import { NextRequest, NextResponse } from "next/server";

const PLATFORM_DOMAIN = "perlamarketplace.com";

/* =========================================================
   HOST HELPERS
========================================================= */

function normalizeHost(host: string) {
  return host.replace(/^www\./, "").split(":")[0].toLowerCase().trim();
}

function getSubdomain(host: string) {
  const cleanHost = normalizeHost(host);

  if (!cleanHost.endsWith(`.${PLATFORM_DOMAIN}`)) {
    return null;
  }

  const subdomain = cleanHost
    .slice(0, -(`.${PLATFORM_DOMAIN}`.length))
    .trim();

  if (!subdomain || subdomain === "www") {
    return null;
  }

  return subdomain;
}

/* =========================================================
   PATH HELPERS
========================================================= */

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

/**
 * Convierte rutas antiguas visibles en rutas canónicas del subdominio.
 *
 * Ejemplos:
 * /tienda/dl-racing-cyber                 -> /
 * /tienda/dl-racing-cyber/producto/123    -> /producto/123
 * /tienda/producto/123                    -> /producto/123
 * /tienda/categorias/perifericos          -> /categorias/perifericos
 */
function getCanonicalSubdomainPath(pathname: string, slug: string) {
  const storeBasePath = `/tienda/${slug}`;

  if (pathname === "/tienda" || pathname === `${storeBasePath}/`) {
    return "/";
  }

  if (pathname === storeBasePath) {
    return "/";
  }

  if (pathname.startsWith(`${storeBasePath}/`)) {
    const suffix = pathname.slice(storeBasePath.length);
    return suffix || "/";
  }

  /*
   * Compatibilidad con rutas antiguas sin slug:
   * /tienda/producto/...
   * /tienda/categorias/...
   * /tienda/combos/...
   * /tienda/carrito
   * /tienda/checkout
   * /tienda/success
   */
  const legacyPrefixes = [
    "/tienda/producto",
    "/tienda/productos",
    "/tienda/categorias",
    "/tienda/categoria",
    "/tienda/combos",
    "/tienda/combo",
    "/tienda/carrito",
    "/tienda/cart",
    "/tienda/checkout",
    "/tienda/success",
  ];

  const matchedPrefix = legacyPrefixes.find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (matchedPrefix) {
    const suffix = pathname.slice("/tienda".length);
    return suffix || "/";
  }

  return null;
}

/* =========================================================
   STORE RESOLUTION
========================================================= */

async function getStoreSlugBySubdomain(subdomain: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Middleware: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
    return null;
  }

  const url = new URL(`${supabaseUrl}/rest/v1/stores`);
  url.searchParams.set("select", "slug");
  url.searchParams.set("subdomain", `eq.${subdomain}`);
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      console.error(
        `Middleware: Supabase respondió ${response.status} al resolver ${subdomain}.`
      );
      return null;
    }

    const data = (await response.json()) as Array<{ slug?: string }>;

    return data?.[0]?.slug || null;
  } catch (error) {
    console.error(
      `Middleware: error resolviendo el subdominio ${subdomain}.`,
      error
    );
    return null;
  }
}

/* =========================================================
   MIDDLEWARE
========================================================= */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * /login y /admin son rutas globales.
   * Nunca deben reescribirse dentro de /tienda/[slug].
   */
  if (shouldIgnorePath(pathname)) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  /*
   * En localhost, dominio raíz o dominios que no sean subdominios
   * de perlamarketplace.com, la aplicación conserva sus rutas normales.
   */
  if (!subdomain) {
    return NextResponse.next();
  }

  const slug = await getStoreSlugBySubdomain(subdomain);

  if (!slug) {
    return NextResponse.next();
  }

  /*
   * 1. Redirección canónica:
   * limpia rutas antiguas que el navegador todavía pueda visitar.
   */
  const canonicalPath = getCanonicalSubdomainPath(pathname, slug);

  if (canonicalPath && canonicalPath !== pathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = canonicalPath;

    return NextResponse.redirect(redirectUrl, 308);
  }

  /*
   * 2. Rewrite interno:
   * la URL visible queda limpia, pero Next.js renderiza las rutas
   * existentes dentro de /tienda/[slug].
   *
   * /                         -> /tienda/dl-racing-cyber
   * /producto/123             -> /tienda/dl-racing-cyber/producto/123
   * /categorias/perifericos   -> /tienda/dl-racing-cyber/categorias/perifericos
   */
  const rewriteUrl = request.nextUrl.clone();
  const cleanPath = pathname === "/" ? "" : pathname;

  rewriteUrl.pathname = `/tienda/${slug}${cleanPath}`;

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
