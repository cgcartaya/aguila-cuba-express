import { getXpressQuoteRates } from "@/lib/shipping/xpress-quote-server";
import { resolveLockerStore } from "@/lib/lockers/server";
import XpressLanding from "@/components/landing/xpress/XpressLanding";
import { isXpressLanding, xpress } from "@/components/landing/xpress/content";
import { isWfCargoHost } from "@/lib/saas/wfcargo-hosts";
import type { Metadata } from "next";
import { getPublicTravelPackages } from "@/lib/services/travel-public";
import { getLuxuryShipping } from '@/lib/luxury/shipping-public';
import { isLuxuryHost } from '@/lib/luxury/hosts';
import LuxuryLanding from "@/components/landing/luxury/LuxuryLanding";
import { buildLuxuryMetadata } from "@/components/landing/luxury/metadata";
import { headers } from "next/headers";

import { buildLandingMetadata, landingProfiles } from "@/components/landing/metadata";
import { buildWfCargoMetadata } from "@/components/landing/wfcargo/metadata";
import PublicProcedures from "@/components/procedures/PublicProcedures";
import { wfLocale } from "@/components/landing/wfcargo/Language";
import WfCargoLanding from "@/components/landing/wfcargo/WfCargoLanding";
import Bar1820Landing from "@/components/landing/bar1820/Bar1820Landing";
import AlvarezLanding from "@/components/landing/alvarez/AlvarezLanding";
import AguilaLanding from "@/components/landing/AguilaLanding";
import DeParisLanding from "@/components/landing/deparis/DeParisLanding";
import JotaJotaLanding from "@/components/landing/jotajota/JotaJotaLanding";
import PerlaMarketplaceLanding from "@/components/landing/PerlaMarketplaceLanding";
import TuMercadoLajeroLanding from "@/components/landing/tumercadolajero/TuMercadoLajeroLanding";
import YoyoLanding from "@/components/landing/yoyo/YoyoLanding";
import { getFeaturedMenuItems, isMenuModuleEnabled } from "@/lib/services/menu";
import { isReservasModuleEnabled } from "@/lib/services/reservas";
import {
  buildPerlaMetadata,
  getStorePublicBaseUrl,
  normalizeStoreHost,
  resolveStoreByHost,
  resolveStoreBySlug,
} from "@/lib/saas/store-metadata";

const PLATFORM_DOMAIN = "perlamarketplace.com";

type LandingType =
  | "luxury"
  | "wfcargo"
  | "aguila"
  | "alvarez"
  | "yoyo"
  | "deparis"
  | "jotajota"
  | "bar1820"
  | "tumercadolajero"
  | "perla";

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

  if (isLuxuryHost(normalizedHost)) return "luxury";

  if (isWfCargoHost(normalizedHost)) return "wfcargo";

  if (
    normalizedHost === "wwwalvareztravel.com" ||
    normalizedHost === "alvareztravel.com" ||
    normalizedHost === `alvares-travel.${PLATFORM_DOMAIN}` ||
    normalizedHost === `alvareztravel.${PLATFORM_DOMAIN}` ||
    normalizedHost === `alvarez-travel.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("alvares-travel.") ||
    normalizedHost.startsWith("alvareztravel.") ||
    normalizedHost.startsWith("alvarez-travel.")
  ) {
    return "alvarez";
  }

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

  if (
    normalizedHost === `yoyo.${PLATFORM_DOMAIN}` ||
    normalizedHost === `yoyo-envios.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("yoyo-envios.") ||
    normalizedHost.startsWith("yoyo.")
  ) {
    return "yoyo";
  }

  if (
    normalizedHost === `deparis.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("deparis.") ||
    normalizedHost === "depariscienfuegos.com" ||
    normalizedHost === "depariscuba.com" ||
    normalizedHost.startsWith("depariscuba.")
  ) {
    return "deparis";
  }

  if (
    normalizedHost === `jotajota.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("jotajota.")
  ) {
    return "jotajota";
  }

  if (normalizedHost === `bar1820.${PLATFORM_DOMAIN}`) return "bar1820";

  if (
    normalizedHost === `tumercadolajero.${PLATFORM_DOMAIN}` ||
    normalizedHost.startsWith("tumercadolajero.")
  ) {
    return "tumercadolajero";
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

export async function generateMetadata({ searchParams }: HomeProps): Promise<Metadata> {
  const host = await getCurrentHost();
  const landing = resolveLanding(host);

  if (landing === "luxury") {
    return buildLuxuryMetadata(await resolveStoreByHost(host));
  }

  if (landing === "wfcargo") {
    const store = await resolveStoreByHost(host) || await resolveStoreBySlug("wf-cago");
    return buildWfCargoMetadata(store, wfLocale((await searchParams).lang));
  }

  const store = await resolveStoreByHost(host);
  if (store && isXpressLanding(store)) {
    return buildLandingMetadata(getStorePublicBaseUrl(store), xpress, {
      ...store,
      meta_title: xpress.title,
      meta_description: xpress.description,
      favicon_url: store.favicon_url || xpress.favicon,
    });
  }

  if (landing !== "perla") {
    const profile = landingProfiles[landing];
    const landingStore = store || await resolveStoreBySlug(profile.slug);
    const canonicalUrl = landing === "alvarez" && store?.slug === "alvarez-travel"
      ? getStorePublicBaseUrl(store)
      : `https://${host}`;
    return buildLandingMetadata(canonicalUrl, profile, landingStore);
  }

  if (store) {
    return buildLandingMetadata(`https://${host}`, {
      name: store.name,
      title: `${store.name} | Tienda online`,
      description: `Compra productos disponibles en ${store.name}.`,
    }, store);
  }

  return buildPerlaMetadata();
}

type HomeProps = { searchParams: Promise<{ lang?: string | string[] }> };

async function LandingContent({ searchParams }: HomeProps) {
  const landing = await getCurrentLanding();

  if (landing === "luxury") {
    const [travel, shipping] = await Promise.allSettled([getPublicTravelPackages(), getLuxuryShipping()]);
    return <LuxuryLanding
      packages={travel.status === 'fulfilled' ? travel.value : []}
      catalogError={travel.status === 'rejected'}
      shipping={shipping.status === 'fulfilled' ? shipping.value : undefined}
    />;
  }

  if (landing === "wfcargo") {
    const store = await resolveLockerStore(await getCurrentHost());
    return <WfCargoLanding locale={wfLocale((await searchParams).lang)} lockersEnabled={Boolean(store)} />;
  }

  if (landing === "tumercadolajero") {
    const store = await resolveStoreBySlug("tumercadolajero");
    return <TuMercadoLajeroLanding logoUrl={store?.logo_url || null} />;
  }

  if (landing === "bar1820") {
    const [store, menuEnabled] = await Promise.all([
      resolveStoreBySlug("bar1820"),
      isMenuModuleEnabled("bar1820"),
    ]);
    return <Bar1820Landing logoUrl={store?.logo_url} menuHref={menuEnabled ? "/menu/bar1820" : undefined} />;
  }

  if (landing === "aguila") {
    const store = await resolveStoreBySlug("aguila");
    return <AguilaLanding logoUrl={store?.logo_url || null} />;
  }

  if (landing === "alvarez") return <AlvarezLanding />;

  if (landing === "yoyo") return <YoyoLanding />;

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
            __html: JSON.stringify(DEPARIS_STRUCTURED_DATA).replace(/</g, "\\u003c"),
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


export default async function HomePage({ searchParams }: HomeProps) {
  const host = (await headers()).get("host") || "";
  const store = await resolveStoreByHost(host);
  if (store && isXpressLanding(store)) {
    const [lockerStore, rates] = await Promise.all([resolveLockerStore(host), getXpressQuoteRates(store.id)]);
    return <XpressLanding rates={rates} lockersEnabled={Boolean(lockerStore)} logoUrl={store.logo_url} storeSlug={store.slug} canonicalUrl={getStorePublicBaseUrl(store)} />;
  }

  const showProcedures = resolveLanding(host) !== "wfcargo" && store?.module_procedures_enabled && store.procedures_public_enabled;
  return <><LandingContent searchParams={searchParams} />{showProcedures && <PublicProcedures name={store.name} color={store.primary_color} />}</>;
}
