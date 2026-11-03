import type { Metadata } from "next";
import { cache } from "react";
import { getItemPublicUrl } from "@/lib/storefront/item-public-url";

import { buildStoreMetadata } from "@/lib/saas/store-metadata";
import { applyPlatformFee, getPlatformFeePercent } from "@/lib/storefront/product-quantity-pricing";
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
  const canonicalUrl = getItemPublicUrl(store, id, "producto");

  if (!product) {
    return buildStoreMetadata(store, canonicalUrl, {
      title: `Producto no disponible | ${store.name}`,
      description: `Este producto ya no está disponible en ${store.name}.`,
    });
  }

  const price = applyPlatformFee(Number(product.price), getPlatformFeePercent(store));
  const priceLabel = Number.isFinite(price) ? `${price.toFixed(2)} USD` : null;
  const title = `${product.name}${priceLabel ? ` | ${priceLabel}` : ""} | ${store.name}`;
  const productDescription = String(product.description || "").replace(/\s+/g, " ").trim();
  const description = `${priceLabel ? `Precio: ${priceLabel}. ` : ""}${productDescription || `Compra ${product.name} en ${store.name}.`}`.slice(0, 200);
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
