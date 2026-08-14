import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { getPublicMenu } from "@/lib/services/menu";
import { getStoreSettings } from "@/lib/services/settings";
import MenuPageClient from "@/components/menu/MenuPageClient";

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
    // MenuPageClient lee ?tipo=bar (para abrir directo en la pestaña
    // Bar cuando se llega desde la landing) con useSearchParams, que
    // en el app router requiere estar dentro de un Suspense boundary.
    <Suspense fallback={null}>
      <MenuPageClient
        store={menu.store}
        categories={menu.categories}
        whatsappNumber={settings?.whatsapp || null}
        landingHref={slug === "deparis" ? "/deparis" : undefined}
      />
    </Suspense>
  );
}
