import type { Metadata } from "next";
import type { StoreMetadataRow } from "@/lib/saas/store-metadata";

export const landingProfiles = {
  aguila: {
    slug: "aguila",
    name: "Aguila Express USA",
    title: "Aguila Express USA | Paquetería, compras y envíos",
    description: "Envíos puerta a puerta, compras y rastreo en tiempo real, con atención personalizada.",
    image: "/aguila/landing/hero-elegant-v1.webp",
  },
  alvarez: {
    slug: "alvarez-travel",
    name: "Alvarez Travel",
    title: "Alvarez Travel | Envíos y viajes entre Hialeah y Cuba",
    description: "Envíos, remesas, viajes y atención personalizada desde Hialeah hacia Cuba.",
    image: "/alvarez/hero-plane.webp",
  },
  yoyo: {
    slug: "yoyo-envios",
    name: "YOYO Envíos",
    title: "YOYO Envíos | Envíos seguros a Cuba",
    description: "Envíos express, aéreos y marítimos a Cuba con rastreo y atención personalizada.",
    image: "/yoyo/v14/hero-daylight.webp",
  },
  deparis: {
    slug: "deparis",
    name: "DeParis",
    title: "DeParis | Restaurante en Cienfuegos",
    description: "Restaurante en Cienfuegos con comida cubana, bar, reservas y pedidos en línea.",
    image: "/deparis/hero-restaurante-deparis.png",
  },
  jotajota: {
    slug: "jotajota",
    name: "Jota Jota",
    title: "Jota Jota | Snack Bar Napolitano",
    description: "Pizza napolitana al horno de leña, masa madre y postres en Cienfuegos.",
    image: "/jotajota/logo.webp",
  },
  bar1820: {
    slug: "bar1820",
    name: "Bar 1820",
    title: "Bar 1820 | Bar y restaurante",
    description: "Explora el menú y conoce Bar 1820.",
    image: "/bar1820/interior.webp",
  },
  tumercadolajero: {
    slug: "tumercadolajero",
    name: "TuMercadoLajero",
    title: "TuMercadoLajero | Tienda online en Mayabeque",
    description: "Compra productos y consulta las opciones de entrega de TuMercadoLajero.",
    image: "/tumercadolajero/entrega-mismo-dia.webp",
  },
};

type LandingProfile = { name: string; title: string; description: string; image?: string };

export function buildLandingMetadata(
  canonicalUrl: string,
  profile: LandingProfile,
  store: StoreMetadataRow | null = null,
): Metadata {
  const title = store?.meta_title?.trim() || profile.title;
  const description = store?.meta_description?.trim() || profile.description;
  const image = store?.og_image_url?.trim() || profile.image || store?.logo_url?.trim() || store?.store_og_image_url?.trim();
  const images = image ? [new URL(image, canonicalUrl).toString()] : [];
  const icon = store?.favicon_url?.trim() || store?.logo_url?.trim();

  return {
    metadataBase: new URL(canonicalUrl),
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title, description, url: canonicalUrl, siteName: profile.name,
      locale: "es_US", type: "website", images,
    },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images },
    icons: { icon: icon ? [icon] : [], shortcut: [], apple: icon ? [icon] : [] },
    robots: { index: true, follow: true },
  };
}
