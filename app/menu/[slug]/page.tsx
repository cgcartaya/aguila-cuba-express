import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicMenu } from "@/lib/services/menu";
import { getStoreSettings } from "@/lib/services/settings";
import MenuPageClient from "@/components/menu/MenuPageClient";

export const revalidate = 300;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

async function resolveParams(params: PageProps["params"]) {
  return await Promise.resolve(params);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await resolveParams(params);
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
  const { slug } = await resolveParams(params);
  const menu = await getPublicMenu(slug);

  if (!menu?.store) {
    notFound();
  }

  if (!menu.store.module_menu_enabled) {
    notFound();
  }

  const { data: settings } = await getStoreSettings(menu.store.id);

  return (
    <MenuPageClient
      store={menu.store}
      categories={menu.categories}
      whatsappNumber={settings?.whatsapp || null}
    />
  );
}
