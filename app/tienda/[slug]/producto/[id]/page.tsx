import type { Metadata } from "next";
import { cache } from "react";

import { buildStoreMetadata } from "@/lib/saas/store-metadata";
import { getStoreProductById } from "@/lib/services/products";
import { getStoreBySlug } from "@/lib/services/stores";
import ProductDetailClient from "./ProductDetailClient";

/*
 * ISR: la página se cachea 30 min. El contenido real lo sigue
 * cargando ProductDetailClient en el navegador (igual que antes),
 * esto solo evita que Vercel ejecute una función nueva en cada
 * visita para servir el mismo HTML base.
 */
export const revalidate = 1800;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

type ProductMetadataImage = {
  image_url?: string | null;
  is_main?: boolean | null;
  position?: number | null;
};

const loadProductMetadata = cache(async (slug: string, id: string) => {
  const store = await getStoreBySlug(slug);
  if (!store?.id || store.is_active === false) return null;

  const { data: product } = await getStoreProductById(id, store.id);
  if (!product) return { store, product: null };

  return { store, product };
});

function getProductPublicUrl(
  store: {
    domain?: string | null;
    subdomain?: string | null;
    slug: string;
    has_landing?: boolean | null;
  },
  productId: string
) {
  const cleanDomain = store.domain
    ?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");

  if (cleanDomain) {
    const path = store.has_landing
      ? `/tienda/producto/${encodeURIComponent(productId)}`
      : `/producto/${encodeURIComponent(productId)}`;
    return `https://${cleanDomain}${path}`;
  }

  const subdomain = store.subdomain?.trim().toLowerCase();
  if (subdomain) {
    const path = store.has_landing
      ? `/tienda/producto/${encodeURIComponent(productId)}`
      : `/producto/${encodeURIComponent(productId)}`;
    return `https://${subdomain}.perlamarketplace.com${path}`;
  }

  return `https://perlamarketplace.com/tienda/${encodeURIComponent(store.slug)}/producto/${encodeURIComponent(productId)}`;
}

function getProductMainImage(product: {
  image_url?: string | null;
  product_images?: ProductMetadataImage[] | null;
}) {
  const images = product.product_images?.slice().sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  );

  return (
    images?.find((image) => image.is_main)?.image_url?.trim() ||
    images?.find((image) => image.image_url?.trim())?.image_url?.trim() ||
    product.image_url?.trim() ||
    null
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const context = await loadProductMetadata(slug, id);

  if (!context?.store) {
    return {
      title: "Producto | Perla Marketplace",
      description: "Consulta este producto en Perla Marketplace.",
    };
  }

  const { store, product } = context;
  const canonicalUrl = getProductPublicUrl(store, id);

  if (!product) {
    return buildStoreMetadata(store, canonicalUrl, {
      title: `Producto no disponible | ${store.name}`,
      description: `Este producto ya no está disponible en ${store.name}.`,
    });
  }

  const title = `${product.name} | ${store.name}`;
  const description =
    String(product.description || "").replace(/\s+/g, " ").trim().slice(0, 200) ||
    `Compra ${product.name} en ${store.name}.`;
  const image = getProductMainImage(product);
  const fallbackMetadata = buildStoreMetadata(store, canonicalUrl, {
    title,
    description,
  });

  if (!image) return fallbackMetadata;

  return {
    ...fallbackMetadata,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: store.name,
      type: "website",
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug, id } = await params;

  return <ProductDetailClient slug={slug} id={id} />;
}
