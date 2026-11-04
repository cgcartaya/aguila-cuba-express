import type { Metadata } from "next";
import type { StoreMetadataRow } from "@/lib/saas/store-metadata";

export function buildWfCargoMetadata(store: StoreMetadataRow | null): Metadata {
  const origin = "https://wf-cargo.perlamarketplace.com";
  const title =
    store?.meta_title?.trim() ||
    "WF Cargo Envíos | Envíos y multiservicios en Port St. Lucie";
  const description =
    store?.meta_description?.trim() ||
    "Envíos a Cuba, República Dominicana y Colombia. Remesas, pasaportes cubanos, notaría, recogidas y renta de autos. Dos sucursales en Port St. Lucie.";
  const image = new URL(
    store?.og_image_url?.trim() ||
      store?.store_og_image_url?.trim() ||
      "/wfcargo/og-wfcargo-v1.jpg",
    origin,
  ).toString();
  const logo =
    store?.favicon_url?.trim() ||
    store?.logo_url?.trim() ||
    "/wfcargo/logo.webp";
  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: origin },
    openGraph: {
      title,
      description,
      url: origin,
      siteName: "WF Cargo Envíos",
      locale: "es_US",
      type: "website",
      images: [
        {
          url: image,
          secureUrl: image,
          width: 1200,
          height: 630,
          alt: "WF Cargo Envíos · Tu mundo más cerca",
          ...(new URL(image).pathname.toLowerCase().endsWith(".jpg")
            ? { type: "image/jpeg" }
            : {}),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: "WF Cargo Envíos · Tu mundo más cerca" }],
    },
    icons: { icon: [{ url: logo }], apple: [{ url: logo }] },
    robots: { index: true, follow: true },
  };
}
