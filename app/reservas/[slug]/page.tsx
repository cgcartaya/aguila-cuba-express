import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { getStoreBySlug } from "@/lib/services/stores";
import { buildStoreMetadata, resolveStoreBySlug } from "@/lib/saas/store-metadata";
import ReservasPageClient from "@/components/reservas/ReservasPageClient";
import DeParisLanguageProvider from "@/components/deparis-i18n/DeParisLanguageProvider";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function getCanonicalUrl(pathname: string) {
  const requestHeaders = await headers();
  const rawHost =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const host = rawHost
    .split(",")[0]
    .trim()
    .replace(/^www\./, "")
    .split(":")[0]
    .toLowerCase();
  const canonicalHost =
    !host || host === "localhost" || host.endsWith(".vercel.app")
      ? "perlamarketplace.com"
      : host;

  return `https://${canonicalHost}${pathname}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [store, metadataStore] = await Promise.all([
    getStoreBySlug(slug),
    resolveStoreBySlug(slug),
  ]);

  if (!store || !metadataStore) {
    return { title: "Reservas | Perla Marketplace" };
  }

  const canonicalUrl = await getCanonicalUrl(`/reservas/${slug}`);
  const title =
    slug === "deparis"
      ? "Reservar mesa en DeParis | Cienfuegos"
      : `Reservar mesa | ${store.name}`;
  const description =
    slug === "deparis"
      ? "Reserva tu mesa en DeParis, restaurante en Cienfuegos, Cuba."
      : `Reserva tu mesa en línea en ${store.name}.`;

  return buildStoreMetadata(metadataStore, canonicalUrl, {
    title,
    description,
  });
}

export default async function ReservasPage({ params }: PageProps) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    notFound();
  }

  if (!store.module_reservas_enabled) {
    notFound();
  }

  const content = (
    <ReservasPageClient
      storeSlug={slug}
      storeName={store.name}
      landingHref={slug === "deparis" ? "/" : undefined}
      accent={store.primary_color || ""}
      bg={store.secondary_color || ""}
    />
  );
  return slug === "deparis" ? <DeParisLanguageProvider floatingSelector>{content}</DeParisLanguageProvider> : content;
}
