import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getPublicMenu } from "@/lib/services/menu";
import { getStoreSettings } from "@/lib/services/settings";
import MenuPageClientHybrid from "@/components/menu/MenuPageClientHybrid";

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const menu = await getPublicMenu(slug);

  if (!menu?.store) {
    return { title: "Menú | Perla Marketplace" };
  }

  return {
    title: `Menú | ${menu.store.name}`,
    description: `Ordena en línea el menú de ${menu.store.name}.`,
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

  return (
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
}
