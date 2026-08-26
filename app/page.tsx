import type { Metadata } from "next";
import { headers } from "next/headers";

import AguilaLanding from "@/components/landing/AguilaLanding";
import DeParisLanding from "@/components/landing/deparis/DeParisLanding";
import JotaJotaLanding from "@/components/landing/jotajota/JotaJotaLanding";
import PerlaMarketplaceLanding from "@/components/landing/PerlaMarketplaceLanding";
import YoyoLanding from "@/components/landing/yoyo/YoyoLanding";
import { getFeaturedMenuItems, isMenuModuleEnabled } from "@/lib/services/menu";
import { isReservasModuleEnabled } from "@/lib/services/reservas";
import {
  buildPerlaMetadata,
  buildStoreMetadata,
  normalizeStoreHost,
  resolveStoreByHost,
  resolveStoreBySlug,
} from "@/lib/saas/store-metadata";

const PLATFORM_DOMAIN = "perlamarketplace.com";

type LandingType = "aguila" | "yoyo" | "deparis" | "jotajota" | "perla";

const DEPARIS_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  name: "DeParis",
  url: "https://depariscienfuegos.com",
  telephone: "+5352994719",
  hasMap: "https://maps.app.goo.gl/pKMAzeFc3uCsxxr18",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cienfuegos",
    addressRegion: "Cienfuegos",
    addressCountry: "CU",
  },
};

function normalizeHost(value: string | null) {
  return normalizeStoreHost(value || "");
}

function resolveLanding(host: string): LandingType {
  const normalizedHost = normalizeHost(host);

  // Dominios personalizados de Águila.
  if (
    normalizedHost === "aguilacubaexpress.com" ||
    normalizedHost === "aguila-cuba-express.com" ||
    normalizedHost === "aguilaexpressusa.com" ||
    normalizedHost.startsWith("aguila.") ||
    normalizedHost.startsWith("aguila-cuba-express.") ||
    normalizedHost.startsWith("aguilacubaexpress.") ||
    normalizedHost.startsWith("aguilaexpressusa.")
  ) {
    return "aguila";
  }

  // Subdominios/dominios admitidos de YOYO.
  if (
    normalizedHost === `yoyo.${PLATFORM_DOMAIN}` ||
    normalizedHost === `yoyo-envios.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("yoyo-envios.") ||
    normalizedHost.startsWith("yoyo.")
  ) {
    return "yoyo";
  }

  // Subdominio y dominios personalizados de De Paris.
  if (
    normalizedHost === `deparis.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("deparis.") ||
    normalizedHost === "depariscienfuegos.com" ||
    normalizedHost === "depariscuba.com" ||
    normalizedHost.startsWith("depariscuba.")
  ) {
    return "deparis";
  }

  // Subdominio y dominios personalizados de Jota Jota.
  if (
    normalizedHost === `jotajota.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("jotajota.")
    // TODO: cuando tengan dominio propio (ej. jotajotapizza.com), agréguenlo aquí:
    // || normalizedHost === "jotajotapizza.com"
    // || normalizedHost.startsWith("jotajotapizza.")
  ) {
    return "jotajota";
  }

  return "perla";
}

async function getCurrentHost() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost || requestHeaders.get("host");

  return normalizeHost(host);
}

async function getCurrentLanding(): Promise<LandingType> {
  return resolveLanding(await getCurrentHost());
}

/**
 * Fallback aislado.
 *
 * Si Supabase no pudiera resolver temporalmente una tienda, NO dejamos
 * que OpenGraph/Twitter hereden datos de otra marca desde el layout raíz.
 */
function buildLandingFallbackMetadata(
  title: string,
  description: string,
  canonicalUrl: string,
  siteName: string
): Metadata {
  return {
    metadataBase: new URL(canonicalUrl),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName,
      locale: "es_US",
      type: "website",
      images: [],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [],
    },
    icons: {
      icon: [],
      shortcut: [],
      apple: [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const host = await getCurrentHost();

  /*
   * PRIMERA REGLA:
   * si el dominio/subdominio pertenece a una tienda registrada, toda la
   * metadata sale de ESA tienda. No usamos slug fijo ni branding por defecto.
   */
  if (
    host &&
    host !== PLATFORM_DOMAIN &&
    host !== "localhost" &&
    host !== "127.0.0.1" &&
    !host.endsWith(".vercel.app")
  ) {
    const store = await resolveStoreByHost(host);

    if (store) {
      return buildStoreMetadata(store, `https://${host}`);
    }
  }

  const landing = resolveLanding(host);

  if (landing === "aguila") {
    const canonicalUrl = host
      ? `https://${host}`
      : "https://aguilacubaexpress.com";

    /*
     * Águila puede responder por varios dominios históricos.
     * Si el host actual no coincide con stores.domain, recuperamos la misma
     * tienda por su slug para conservar favicon, OG image y logo.
     */
    const store = await resolveStoreBySlug("aguila");

    if (store) {
      return buildStoreMetadata(store, canonicalUrl);
    }

    return buildLandingFallbackMetadata(
      "Aguila Express USA | Paquetería, compras y envíos",
      "Envíos puerta a puerta, compras y rastreo en tiempo real, con atención personalizada.",
      canonicalUrl,
      "Aguila Express USA"
    );
  }

  if (landing === "yoyo") {
    const canonicalUrl = host
      ? `https://${host}`
      : `https://yoyo.${PLATFORM_DOMAIN}`;

    return buildLandingFallbackMetadata(
      "YOYO Envíos | Envíos seguros a Cuba",
      "Envíos express, aéreos y marítimos a Cuba con rastreo y atención personalizada.",
      canonicalUrl,
      "YOYO Envíos"
    );
  }

  if (landing === "deparis") {
    const canonicalUrl = host
      ? `https://${host}`
      : "https://depariscuba.com";

    return buildLandingFallbackMetadata(
      "De Paris | Panadería, bistró y mercado gourmet",
      "Panadería francesa, bistró y mercado gourmet — pide en línea con entrega y rastreo.",
      canonicalUrl,
      "De Paris"
    );
  }

  if (landing === "jotajota") {
    const canonicalUrl = host
      ? `https://${host}`
      : `https://jotajota.${PLATFORM_DOMAIN}`;

    /*
     * Igual que Águila: recuperamos la tienda por su slug para heredar
     * favicon, OG image y logo reales en vez de valores genéricos.
     */
    const store = await resolveStoreBySlug("jotajota");

    if (store) {
      return buildStoreMetadata(store, canonicalUrl);
    }

    return buildLandingFallbackMetadata(
      "Jota Jota | Snack Bar Napolitano",
      "Snack bar napolitano: pizza al horno de leña, masa madre y postres — pide en línea o reserva tu mesa.",
      canonicalUrl,
      "Jota Jota"
    );
  }

  return buildPerlaMetadata();
}

export default async function HomePage() {
  const landing = await getCurrentLanding();

  if (landing === "aguila") {
    const store = await resolveStoreBySlug("aguila");
    return <AguilaLanding logoUrl={store?.logo_url || null} />;
  }

  if (landing === "yoyo") {
    return <YoyoLanding />;
  }

  if (landing === "deparis") {
    const [menuEnabled, featuredItems, reservasEnabled] = await Promise.all([
      isMenuModuleEnabled("deparis"),
      getFeaturedMenuItems("deparis", 12),
      isReservasModuleEnabled("deparis"),
    ]);

    const featuredDishes = featuredItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      image_url: item.image_url,
      venue_type: item.venue_type,
    }));

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(DEPARIS_STRUCTURED_DATA).replace(
              /</g,
              "\\u003c"
            ),
          }}
        />
        <DeParisLanding
          menuHref={menuEnabled ? "/menu/deparis" : undefined}
          featuredDishes={featuredDishes}
          reservasHref={reservasEnabled ? "/reservas/deparis" : undefined}
        />
      </>
    );
  }

  if (landing === "jotajota") {
    const [menuEnabled, featuredItems, reservasEnabled] = await Promise.all([
      isMenuModuleEnabled("jotajota"),
      getFeaturedMenuItems("jotajota", 12),
      isReservasModuleEnabled("jotajota"),
    ]);

    const featuredDishes = featuredItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      image_url: item.image_url,
      venue_type: item.venue_type,
    }));

    return (
      <JotaJotaLanding
        menuHref={menuEnabled ? "/menu/jotajota" : undefined}
        featuredDishes={featuredDishes}
        reservasHref={reservasEnabled ? "/reservas/jotajota" : undefined}
      />
    );
  }

  return <PerlaMarketplaceLanding />;
}
