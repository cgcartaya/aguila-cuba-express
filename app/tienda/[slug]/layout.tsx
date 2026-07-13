import type { Metadata } from "next";
import type { ReactNode } from "react";

import {
  buildPerlaMetadata,
  buildStoreMetadata,
  resolveStoreBySlug,
} from "@/lib/saas/store-metadata";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Omit<LayoutProps, "children">): Promise<Metadata> {
  const { slug } = await params;
  const store = await resolveStoreBySlug(slug);

  if (!store) {
    return buildPerlaMetadata();
  }

  return buildStoreMetadata(
    store,
    `https://perlamarketplace.com/tienda/${store.slug}`
  );
}

export default function StoreSlugLayout({
  children,
}: LayoutProps) {
  return children;
}
