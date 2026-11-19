import type { WfLocale } from "./Language";
import { wfCargoOrigin } from "@/lib/saas/wfcargo-hosts";
import type { Metadata } from "next";
import type { StoreMetadataRow } from "@/lib/saas/store-metadata";

export function buildWfCargoMetadata(store: StoreMetadataRow | null, locale: WfLocale = "es"): Metadata {
  const origin = wfCargoOrigin;
  const english = locale === "en";
  const url = english ? `${origin}/?lang=en` : origin;
  const cleanCopy = (text: string | undefined) => text?.trim().replace(/\bnotari[oa]\s+p[úu]blic[oa]\b|\bnotaría\b/giu, "gestión de documentos");
  const title = english ? "WF Cargo Envíos | Shipping and related services in Port St. Lucie" :
    cleanCopy(store?.meta_title ?? undefined) ||
    "WF Cargo Envíos | Envíos y multiservicios en Port St. Lucie";
  const description = english ? "Shipping to Cuba, the Dominican Republic, and Colombia. Money transfers, Cuban passports, apostilles, pickups, and car rentals." :
    cleanCopy(store?.meta_description ?? undefined) ||
    "Envíos a Cuba, República Dominicana y Colombia. Remesas, pasaportes cubanos, apostillas, recogidas y renta de autos. Dos sucursales en Port St. Lucie.";
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
  const imageAlt = english ? "WF Cargo Envíos · Bringing your world closer" : "WF Cargo Envíos · Tu mundo más cerca";
  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: url, languages: { es: origin, en: `${origin}/?lang=en`, "x-default": origin } },
    openGraph: {
      title,
      description,
      url,
      siteName: "WF Cargo Envíos",
      locale: english ? "en_US" : "es_US",
      type: "website",
      images: [
        {
          url: image,
          secureUrl: image,
          width: 1200,
          height: 630,
          alt: imageAlt,
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
      images: [{ url: image, alt: imageAlt }],
    },
    icons: { icon: [{ url: logo }], apple: [{ url: logo }] },
    robots: { index: true, follow: true },
  };
}

export function buildWfCargoPageMetadata(
  path: "/casillero" | "/remesas",
  title: string,
  description: string,
  locale: WfLocale = "es",
): Metadata {
  const brand = buildWfCargoMetadata(null, locale);
  const es = wfCargoOrigin + path;
  const en = es + "?lang=en";
  const url = locale === "en" ? en : es;

  return {
    ...brand,
    title: { absolute: title },
    description,
    alternates: {
      canonical: url,
      ...(path === "/remesas" ? { languages: { es, en, "x-default": es } } : {}),
    },
    openGraph: { ...brand.openGraph, title, description, url },
    twitter: { ...brand.twitter, card: "summary_large_image", title, description },
    robots: path === "/casillero" ? { index: false, follow: false } : brand.robots,
  };
}
