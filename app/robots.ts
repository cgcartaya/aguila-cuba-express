import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const DOMAIN_BASE_URLS: Record<string, string> = {
  "aguilaexpressusa.com": "https://aguilaexpressusa.com",
  "depariscienfuegos.com": "https://www.depariscienfuegos.com",
  "perlamarketplace.com": "https://perlamarketplace.com",
  "yoyo-envios.com": "https://yoyo-envios.com",
};

function normalizeHost(value: string | null) {
  return (value || "")
    .split(",")[0]
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(":")[0]
    .toLowerCase();
}

function resolveBaseUrl(host: string) {
  return DOMAIN_BASE_URLS[host] || DOMAIN_BASE_URLS["perlamarketplace.com"];
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host = normalizeHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host")
  );
  const baseUrl = resolveBaseUrl(host);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/auth/",
        "/login",
        "/checkout",
        "/tienda/checkout",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
