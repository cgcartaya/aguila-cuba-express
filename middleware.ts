import { NextRequest, NextResponse } from "next/server";

const PLATFORM_DOMAIN = "perlamarketplace.com";

/* =========================================================
   TYPES
========================================================= */

type StoreResolution = {
  slug: string;
  hasLanding: boolean;
};

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
 * Solo se utiliza para empresas cuya página principal es directamente
 * la tienda, por ejemplo DL Racing.
 *
 * Ejemplos:
 * /tienda/dl-racing-cyber              -> /
 * /tienda/dl-racing-cyber/producto/123 -> /producto/123
 * /tienda/producto/123                 -> /producto/123
 */
function getCanonicalStorefrontPath(pathname: string, slug: string) {
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

/**
 * Devuelve la ruta interna de tienda para empresas que tienen landing.
 *
 * La URL pública mantiene /tienda para no confundir la landing con el
 * marketplace:
 *
 * /tienda                         -> /tienda/[slug]
 * /tienda/producto/123            -> /tienda/[slug]/producto/123
 * /tienda/categorias/perifericos  -> /tienda/[slug]/categorias/perifericos
 */
function getLandingStoreRewritePath(pathname: string, slug: string) {
  const storeBasePath = `/tienda/${slug}`;

  /*
   * Estas rutas todavía no tienen versión bajo /tienda/[slug]/...,
   * así que se dejan pasar tal cual para que sigan resolviendo la
   * tienda del lado del cliente (como ya hacían antes).
   * Sin esto, un dominio propio con landing (ej. Águila) recibía
   * un 404 al entrar a /tienda/combos o /tienda/productos-destacados.
   */
  const noSlugEquivalent = ["/tienda/combos", "/tienda/productos-destacados"];

  if (
    noSlugEquivalent.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }

  if (
    pathname === "/tienda" ||
    pathname === "/tienda/" ||
    pathname === storeBasePath ||
    pathname === `${storeBasePath}/`
  ) {
    return storeBasePath;
  }

  if (pathname.startsWith(`${storeBasePath}/`)) {
    return pathname;
  }

  if (pathname.startsWith("/tienda/")) {
    const suffix = pathname.slice("/tienda".length);
    return `${storeBasePath}${suffix}`;
  }

  return null;
}

/* =========================================================
   STORE RESOLUTION
========================================================= */

async function getStoreByColumn(
  column: "subdomain" | "domain",
  value: string
): Promise<StoreResolution | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Middleware: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
    return null;
  }

  const url = new URL(`${supabaseUrl}/rest/v1/stores`);
  url.searchParams.set("select", "slug,has_landing");
  url.searchParams.set(column, `eq.${value}`);
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
        `Middleware: Supabase respondió ${response.status} al resolver ${column}=${value}.`
      );
      return null;
    }

    const data = (await response.json()) as Array<{
      slug?: string;
      has_landing?: boolean | null;
    }>;

    const store = data?.[0];

    if (!store?.slug) {
      return null;
    }

    return {
      slug: store.slug,
      hasLanding: store.has_landing === true,
    };
  } catch (error) {
    console.error(
      `Middleware: error resolviendo ${column}=${value}.`,
      error
    );
    return null;
  }
}

function getStoreBySubdomain(subdomain: string) {
  return getStoreByColumn("subdomain", subdomain);
}

/*
 * Dominios propios (aguilacubaexpress.com, depariscuba.com, etc.).
 * Reutiliza exactamente la misma resolución/rewrite que ya usan los
 * subdominios *.perlamarketplace.com, para que esas tiendas también
 * rendericen a través de /tienda/[slug]/... en vez de las rutas
 * "planas" de /tienda/producto, /tienda/categorias, etc.
 *
 * Esto es lo que permite que esas páginas puedan cachearse (ISR) en
 * vez de ejecutar una función en cada visita.
 */
function getStoreByCustomDomain(host: string) {
  return getStoreByColumn("domain", host);
}

/* =========================================================
   MIDDLEWARE
========================================================= */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * /login, /admin, API, autenticación y archivos estáticos son globales.
   * Nunca deben reescribirse dentro de /tienda/[slug].
   */
  if (shouldIgnorePath(pathname)) {
    return NextResponse.next();
  }

  const host = request.headers.get("host") || "";
  const subdomain = getSubdomain(host);

  /*
   * En localhost y en el dominio raíz (perlamarketplace.com sin
   * subdominio) no hay tienda que resolver: se conservan las rutas
   * normales de la plataforma.
   */
  const normalizedHost = normalizeHost(host);

  if (
    !subdomain &&
    (normalizedHost === PLATFORM_DOMAIN ||
      normalizedHost === "localhost" ||
      normalizedHost.endsWith(".vercel.app"))
  ) {
    return NextResponse.next();
  }

  const store = subdomain
    ? await getStoreBySubdomain(subdomain)
    : await getStoreByCustomDomain(normalizedHost);

  if (!store) {
    return NextResponse.next();
  }

  const { slug, hasLanding } = store;

  /* =======================================================
     EMPRESAS CON LANDING

     /                 -> landing existente
     /login            -> login global
     /tienda            -> tienda de la empresa
     /tienda/producto/* -> producto dentro de la tienda

     Las demás rutas se dejan pasar para conservar rastreo,
     cotizador, contacto, SEO y cualquier sección de la landing.
  ======================================================= */
  if (hasLanding) {
    const storeRewritePath = getLandingStoreRewritePath(pathname, slug);

    if (storeRewritePath) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = storeRewritePath;

      return NextResponse.rewrite(rewriteUrl);
    }

    return NextResponse.next();
  }

  /* =======================================================
     EMPRESAS SIN LANDING

     Conservan el comportamiento anterior: el subdominio abre
     directamente la tienda con URLs públicas limpias.
  ======================================================= */
  const canonicalPath = getCanonicalStorefrontPath(pathname, slug);

  if (canonicalPath && canonicalPath !== pathname) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = canonicalPath;

    return NextResponse.redirect(redirectUrl, 308);
  }

  const rewriteUrl = request.nextUrl.clone();
  const cleanPath = pathname === "/" ? "" : pathname;

  rewriteUrl.pathname = `/tienda/${slug}${cleanPath}`;

  return NextResponse.rewrite(rewriteUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
