import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getPublicMenu } from "@/lib/services/menu";
import { getStoreSettings } from "@/lib/services/settings";
import MenuPageClientHybrid from "@/components/menu/MenuPageClientHybrid";
import DeParisLanguageProvider from "@/components/deparis-i18n/DeParisLanguageProvider";

export const revalidate = 300;
export const dynamicParams = true;

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
  const menu = await getPublicMenu(slug);

  if (!menu?.store) {
    return { title: "Menú | Perla Marketplace" };
  }

  const canonicalUrl = await getCanonicalUrl(`/menu/${slug}`);
  const title =
    slug === "deparis"
      ? "Menú de DeParis | Restaurante en Cienfuegos"
      : `Menú | ${menu.store.name}`;
  const description =
    slug === "deparis"
      ? "Consulta el menú de DeParis en Cienfuegos y descubre sus platos, bebidas y especialidades disponibles."
      : `Ordena en línea el menú de ${menu.store.name}.`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

export default async function MenuPage({ params }: PageProps) {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);

  if (!menu?.store) {
    notFound();
  }

  if (!menu.store.module_menu_enabled) {
    notFound();
  }

  const { data: settings } = await getStoreSettings(menu.store.id);

  const content = (
    <Suspense fallback={null}>
      <MenuPageClientHybrid
        store={menu.store}
        categories={menu.categories}
        dailyMenus={menu.dailyMenus}
        whatsappNumber={settings?.whatsapp || null}
        landingHref={slug === "deparis" ? "/" : undefined}
        storeSlug={slug}
      />
    </Suspense>
  );
  return slug === "deparis" ? <DeParisLanguageProvider floatingSelector>{content}</DeParisLanguageProvider> : content;
}
