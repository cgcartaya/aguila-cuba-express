import type { Metadata } from "next";
import { getStorefrontCanonicalUrl } from "@/lib/saas/store-metadata";
import { getStoreBySlug } from "@/lib/services/stores";
import StorePageClient from "./StorePageClient";

export const revalidate = 1800;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    return {
      title: "Tienda | Perla Marketplace",
      description: "Tienda online en Perla Marketplace.",
    };
  }

  const title = store.meta_title || `${store.name} | Perla Marketplace`;
  const description =
    store.meta_description || `Descubre productos, ofertas y novedades de ${store.name}.`;

  const pageUrl = getStorefrontCanonicalUrl(store);

  const image =
    store.store_og_image_url ||
    store.og_image_url ||
    "https://perlamarketplace.com/og-image.jpg";

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: store.name,
      type: "website",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function Page() {
  return <StorePageClient />;
}
