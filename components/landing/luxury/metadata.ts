import type { Metadata } from "next";
import type { StoreMetadataRow } from "@/lib/saas/store-metadata";

export function buildLuxuryMetadata(store: StoreMetadataRow | null): Metadata {
  const origin = "https://luxury-travel-point.perlamarketplace.com";
  const title = store?.meta_title?.trim() || "Luxury Travel Point | Viajes, cruceros y experiencias a tu medida";
  const description = store?.meta_description?.trim() || "Descubre destinos, viajes en grupo y privados, cruceros y escapadas al Caribe. Asesoría personalizada desde Lehigh Acres. También envíos a Cuba y multiservicios.";
  // Landing SEO takes precedence over the separate storefront sharing image.
  const configuredImage = store?.og_image_url?.trim() || store?.store_og_image_url?.trim();
  const image = new URL(configuredImage || "/luxury/hero.webp", origin).toString();
  const favicon = store?.favicon_url?.trim() || "/luxury/airplane.webp";
  const pathname = new URL(image).pathname.toLowerCase();
  const imageType = pathname.endsWith(".png") ? "image/png" : /\.jpe?g$/.test(pathname) ? "image/jpeg" : pathname.endsWith(".webp") ? "image/webp" : undefined;

  return {
    metadataBase: new URL(origin),
    title: { absolute: title },
    description,
    alternates: { canonical: origin },
    openGraph: {
      title, description, url: origin, siteName: "Luxury Travel Point", locale: "es_US", type: "website",
      images: [{
        url: image, secureUrl: image, alt: "Luxury Travel Point · Viajes, cruceros y experiencias",
        ...(imageType ? { type: imageType } : {}),
        // Do not apply the portrait fallback's dimensions to an uploaded image.
        ...(!configuredImage ? { width: 1920, height: 2560 } : {}),
      }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
    icons: { icon: [{ url: favicon }], apple: [{ url: store?.favicon_url?.trim() || "/luxury/logo.webp" }] },
    robots: { index: true, follow: true },
  };
}
