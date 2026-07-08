import type { Metadata } from "next";
import { getStoreBySlug } from "@/lib/services/stores";
import StorePageClient from "./StorePageClient";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

async function resolveParams(params: PageProps["params"]) {
  return await Promise.resolve(params);
}

function getBaseUrl(store: {
  domain?: string | null;
  slug?: string | null;
}) {
  if (store.domain) {
    return `https://${store.domain.replace(/^https?:\/\//, "").replace(/^www\./, "")}`;
  }

  return "https://perlamarketplace.com";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await resolveParams(params);
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

  const baseUrl = getBaseUrl(store);
  const pageUrl = store.domain
    ? `${baseUrl}/tienda/${store.slug}`
    : `https://perlamarketplace.com/tienda/${store.slug}`;

  const image = store.og_image_url || `${baseUrl}/og-image.jpg`;

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
