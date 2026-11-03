import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/services/stores";
import { getPublicComboById } from "@/lib/services/combos";
import { buildStoreMetadata } from "@/lib/saas/store-metadata";
import { getItemPublicUrl } from "@/lib/storefront/item-public-url";
import { applyPlatformFee, getPlatformFeePercent } from "@/lib/storefront/product-quantity-pricing";

export async function generateComboMetadata({ params }: { params: Promise<{slug: string; id: string}> }): Promise<Metadata> {
  const { slug, id } = await params;
  const store = await getStoreBySlug(slug);
  if (!store?.id || !store.is_active) return { title: "Combo no disponible", robots: { index: false, follow: false } };
  const canonical = getItemPublicUrl(store, id, "combos");
  const { data: combo } = await getPublicComboById(id, store.id);
  if (!combo) return { ...buildStoreMetadata(store, canonical, { title: "Combo no disponible" }), robots: { index: false, follow: false } };
  const price = applyPlatformFee(Number(combo.price), getPlatformFeePercent(store));
  const priceLabel = Number.isFinite(price) ? `${price.toFixed(2)} USD` : null;
  const title = `${combo.name}${priceLabel ? ` | ${priceLabel}` : ""} | ${store.name}`;
  const details = String(combo.description || "").replace(/\s+/g, " ").trim();
  const description = `${priceLabel ? `Precio: ${priceLabel}. ` : ""}${details || `Compra ${combo.name} en ${store.name}.`}`.slice(0, 200);
  const metadata = buildStoreMetadata(store, canonical, { title, description });
  const image = combo.image_url?.trim();
  if (!image) return metadata;
  return { ...metadata, openGraph: { title, description, url: canonical, siteName: store.name, type: "website", images: [{ url: image, alt: combo.name }] }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}
