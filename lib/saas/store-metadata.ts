import type { Metadata } from "next";

const PLATFORM_DOMAIN = "perlamarketplace.com";
const PERLA_FAVICON = "/perla-favicon.ico";
const PERLA_OG_IMAGE = "/og-image.jpg";

type StoreMetadataRow = {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  domain: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  is_active: boolean | null;
};

function normalizeHost(value: string) {
  return value
    .split(",")[0]
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(":")[0]
    .toLowerCase();
}

function getSubdomain(host: string) {
  if (!host.endsWith(`.${PLATFORM_DOMAIN}`)) return null;

  const value = host.slice(0, -(`.${PLATFORM_DOMAIN}`.length)).trim();

  if (!value || value === "www") return null;

  return value;
}

async function fetchStore(
  column: "slug" | "subdomain" | "domain",
  value: string
): Promise<StoreMetadataRow | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !value) {
    return null;
  }

  const url = new URL(`${supabaseUrl}/rest/v1/stores`);

  url.searchParams.set(
    "select",
    [
      "id",
      "name",
      "slug",
      "subdomain",
      "domain",
      "logo_url",
      "favicon_url",
      "meta_title",
      "meta_description",
      "og_image_url",
      "is_active",
    ].join(",")
  );

  url.searchParams.set(column, `eq.${value}`);
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Metadata: Supabase respondió ${response.status} buscando ${column}=${value}.`
      );
      return null;
    }

    const rows = (await response.json()) as StoreMetadataRow[];

    return rows[0] || null;
  } catch (error) {
    console.error("Metadata: no se pudo resolver la tienda.", error);
    return null;
  }
}

export async function resolveStoreByHost(
  rawHost: string
): Promise<StoreMetadataRow | null> {
  const host = normalizeHost(rawHost);

  if (
    !host ||
    host === PLATFORM_DOMAIN ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app")
  ) {
    return null;
  }

  const subdomain = getSubdomain(host);

  if (subdomain) {
    return fetchStore("subdomain", subdomain);
  }

  return fetchStore("domain", host);
}

export async function resolveStoreBySlug(
  slug: string
): Promise<StoreMetadataRow | null> {
  return fetchStore("slug", slug.trim().toLowerCase());
}

export function buildPerlaMetadata(): Metadata {
  const title = "Perla Marketplace | Tu tienda online lista para vender";
  const description =
    "Plataforma SaaS multiempresa para crear, administrar y hacer crecer tiendas online.";

  return {
    metadataBase: new URL("https://perlamarketplace.com"),
    title: {
      default: title,
      template: "%s | Perla Marketplace",
    },
    description,
    icons: {
      icon: [{ url: PERLA_FAVICON, type: "image/x-icon" }],
      shortcut: [{ url: PERLA_FAVICON, type: "image/x-icon" }],
      apple: [{ url: PERLA_FAVICON }],
    },
    openGraph: {
      title,
      description,
      url: "https://perlamarketplace.com",
      siteName: "Perla Marketplace",
      images: [{ url: PERLA_OG_IMAGE }],
      locale: "es_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [PERLA_OG_IMAGE],
    },
  };
}

export function buildStoreMetadata(
  store: StoreMetadataRow,
  canonicalUrl: string
): Metadata {
  const title =
    store.meta_title?.trim() ||
    `${store.name} | Tienda online`;

  const description =
    store.meta_description?.trim() ||
    `Compra productos disponibles en ${store.name}.`;

  const favicon =
    store.favicon_url?.trim() ||
    store.logo_url?.trim() ||
    PERLA_FAVICON;

  const image =
    store.og_image_url?.trim() ||
    store.logo_url?.trim() ||
    PERLA_OG_IMAGE;

  return {
    metadataBase: new URL(canonicalUrl),
    title: {
      default: title,
      template: `%s | ${store.name}`,
    },
    description,
    icons: {
      icon: [
        {
          url: favicon,
          type: favicon.endsWith(".ico")
            ? "image/x-icon"
            : undefined,
        },
      ],
      shortcut: [{ url: favicon }],
      apple: [{ url: favicon }],
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: store.name,
      images: [{ url: image }],
      locale: "es_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}
