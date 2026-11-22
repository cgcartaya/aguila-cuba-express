import { resolveStoreBySlug } from "@/lib/saas/store-metadata";
import { getXpressQuoteRates } from "@/lib/shipping/xpress-quote-server";
import type { Metadata } from "next";
import XpressLanding from "@/components/landing/xpress/XpressLanding";

export const metadata: Metadata = {
  title: "Vista previa de Xpress Multiservices",
  robots: { index: false, follow: false },
};

export default async function XpressPreviewPage() {
  const store = await resolveStoreBySlug("xpress");
  return <XpressLanding storeSlug={store?.slug} rates={store ? await getXpressQuoteRates(store.id) : []} />;
}
