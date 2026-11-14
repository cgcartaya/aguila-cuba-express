import { isWfCargoHost, wfCargoOrigin } from "@/lib/saas/wfcargo-hosts";
import { luxuryLanguageUrls } from '@/lib/luxury/seo';
import { getPublicTravelPackages } from '@/lib/services/travel-public';
import { isLuxuryHost, luxuryOrigin } from '@/lib/luxury/hosts';
import { sections } from '@/lib/luxury/dmc/content';
import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

type ChangeFrequency = NonNullable<
  MetadataRoute.Sitemap[number]["changeFrequency"]
>;

type PublicRoute = {
  path: string;
  changeFrequency: ChangeFrequency;
  priority: number;
};

type DomainSitemap = {
  baseUrl: string;
  routes: PublicRoute[];
};
//prueba

const DOMAIN_SITEMAPS: Record<string, DomainSitemap> = {
  "alvarez-travel.com": {
    baseUrl: "https://alvarez-travel.com",
    routes: [
      { path: "/", changeFrequency: "weekly", priority: 1 },
      { path: "/tienda", changeFrequency: "daily", priority: 0.9 },
      { path: "/rastrear", changeFrequency: "weekly", priority: 0.8 },
    ],
  },
  "aguilaexpressusa.com": {
    baseUrl: "https://aguilaexpressusa.com",
    routes: [
      { path: "/", changeFrequency: "weekly", priority: 1 },
      { path: "/servicios", changeFrequency: "weekly", priority: 0.8 },
      { path: "/tienda", changeFrequency: "daily", priority: 0.9 },
      { path: "/rastrear", changeFrequency: "weekly", priority: 0.8 },
      { path: "/contacto", changeFrequency: "monthly", priority: 0.7 },
    ],
  },
  "depariscienfuegos.com": {
    baseUrl: "https://depariscienfuegos.com",
    routes: [
      { path: "/", changeFrequency: "weekly", priority: 1 },
      { path: "/menu/deparis", changeFrequency: "daily", priority: 0.9 },
      { path: "/reservas/deparis", changeFrequency: "weekly", priority: 0.8 },
    ],
  },
  "perlamarketplace.com": {
    baseUrl: "https://perlamarketplace.com",
    routes: [{ path: "/", changeFrequency: "weekly", priority: 1 }],
  },
  "yoyo-envios.com": {
    baseUrl: "https://yoyo-envios.com",
    routes: [{ path: "/", changeFrequency: "weekly", priority: 1 }],
  },
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

function resolveSitemap(host: string): DomainSitemap {
  return DOMAIN_SITEMAPS[host] || DOMAIN_SITEMAPS["perlamarketplace.com"];
}

function buildUrl(baseUrl: string, path: string) {
  return path === "/" ? baseUrl : `${baseUrl}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const host = normalizeHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host")
  );
  if (isLuxuryHost(host)) {
    const [{ stateGuides }, packages] = await Promise.all([
      import('@/lib/luxury/dmc/state-guides'),
      getPublicTravelPackages(),
    ]);
    const paths = [...sections, ...Object.entries(stateGuides).flatMap(([slug, guide]) => {
      const path = 'destinations/' + slug;
      return [path, ...guide.cities.map((city) => path + '/' + city.slug)];
    })];
    return [
      { url: luxuryOrigin + '/' },
      ...packages.map(({ id, updated_at }) => ({
        url: luxuryOrigin + '/viajes/' + id,
        lastModified: updated_at,
      })),
      ...paths.flatMap((path) => {
        const languages = luxuryLanguageUrls('/' + path);
        return [languages.en, languages.es].map((url) => ({ url, alternates: { languages } }));
      }),
    ];
  }
  if (isWfCargoHost(host)) return [{ url: wfCargoOrigin }];
  const domainSitemap = resolveSitemap(host);

  return domainSitemap.routes.map((route) => ({
    url: buildUrl(domainSitemap.baseUrl, route.path),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
