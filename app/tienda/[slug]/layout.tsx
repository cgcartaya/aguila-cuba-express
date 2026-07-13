import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getStoreBySlug } from "@/lib/services/stores";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Omit<LayoutProps, "children">): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  const title =
    store?.meta_title?.trim() ||
    store?.name?.trim() ||
    "Perla Marketplace";

  const description =
    store?.meta_description?.trim() ||
    `Compra productos disponibles en ${store?.name || "nuestra tienda"}.`;

  const favicon =
    store?.favicon_url?.trim() ||
    store?.logo_url?.trim() ||
    "/favicon.ico";

  return {
    title,
    description,
    icons: {
      icon: [{ url: favicon }],
      shortcut: [{ url: favicon }],
      apple: [{ url: favicon }],
    },
    openGraph: {
      title,
      description,
      images: store?.og_image_url
        ? [{ url: store.og_image_url }]
        : store?.logo_url
          ? [{ url: store.logo_url }]
          : [],
    },
  };
}

export default function StoreSlugLayout({
  children,
}: LayoutProps) {
  return children;
}
