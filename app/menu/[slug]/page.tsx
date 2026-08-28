import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getPublicMenu } from "@/lib/services/menu";
import { getStoreSettings } from "@/lib/services/settings";
import { buildStoreMetadata, resolveStoreBySlug } from "@/lib/saas/store-metadata";
import MenuPageClientHybrid from "@/components/menu/MenuPageClientHybrid";
import MenuUsdPriceDecorator from "@/components/menu/MenuUsdPriceDecorator";
import DeParisLanguageProvider from "@/components/deparis-i18n/DeParisLanguageProvider";

export const revalidate = 300;
export const dynamicParams = true;
type PageProps = { params: Promise<{ slug: string }> };

async function getCanonicalUrl(pathname: string) {
  const requestHeaders = await headers();
  const rawHost = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const host = rawHost.split(",")[0].trim().replace(/^www\./, "").split(":")[0].toLowerCase();
  const canonicalHost = !host || host === "localhost" || host.endsWith(".vercel.app") ? "perlamarketplace.com" : host;
  return `https://${canonicalHost}${pathname}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [menu, metadataStore] = await Promise.all([getPublicMenu(slug), resolveStoreBySlug(slug)]);
  if (!menu?.store || !metadataStore) return { title: "Menú | Perla Marketplace" };
  const canonicalUrl = await getCanonicalUrl(`/menu/${slug}`);
  const title = slug === "deparis" ? "Menú de DeParis | Restaurante en Cienfuegos" : `Menú | ${menu.store.name}`;
  const description = slug === "deparis" ? "Consulta el menú de DeParis en Cienfuegos y descubre sus platos, bebidas y especialidades disponibles." : `Ordena en línea el menú de ${menu.store.name}.`;
  return buildStoreMetadata(metadataStore, canonicalUrl, { title, description });
}

export default async function MenuPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);
  if (!menu?.store || !menu.store.module_menu_enabled) notFound();
  const { data: settings } = await getStoreSettings(menu.store.id);
  const cupPerUsd = settings?.menu_cup_per_usd ? Number(settings.menu_cup_per_usd) : null;
  const cupPerEur = settings?.menu_cup_per_eur ? Number(settings.menu_cup_per_eur) : null;
  const validUsd = cupPerUsd !== null && Number.isFinite(cupPerUsd) && cupPerUsd > 0;
  const validEur = cupPerEur !== null && Number.isFinite(cupPerEur) && cupPerEur > 0;
  const showCurrencySelector = settings?.menu_show_usd_equivalent === true && (validUsd || validEur);

  const content = (
    <Suspense fallback={null}>
      <MenuUsdPriceDecorator enabled={showCurrencySelector} cupPerUsd={validUsd ? cupPerUsd : null} cupPerEur={validEur ? cupPerEur : null} />
      <MenuPageClientHybrid store={menu.store} categories={menu.categories} dailyMenus={menu.dailyMenus} whatsappNumber={settings?.whatsapp || null} landingHref={slug === "deparis" ? "/" : undefined} storeSlug={slug} />
    </Suspense>
  );
  return slug === "deparis" ? <DeParisLanguageProvider floatingSelector>{content}</DeParisLanguageProvider> : content;
}
