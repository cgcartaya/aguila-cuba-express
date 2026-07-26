import type { Metadata } from "next";
import { headers } from "next/headers";
import { PublicOrderClient } from "./PublicOrderClient";

type PageProps = {
  params: Promise<{
    orderNumber: string;
  }>;
};

type OrderStoreRow = {
  store_id: string | null;
};

type StoreBrandRow = {
  name: string;
  logo_url: string | null;
  og_image_url: string | null;
};

const FALLBACK_STORE_NAME = "Águila Cuba Express";
const FALLBACK_IMAGE = "/og-order.png";

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

async function supabaseRest<T>(url: URL): Promise<T | null> {
  const { key } = getSupabaseConfig();

  if (!key) return null;

  try {
    const response = await fetch(url.toString(), {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(
        `Pedido metadata: Supabase respondió ${response.status}.`
      );
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error("Pedido metadata: no se pudo consultar Supabase.", error);
    return null;
  }
}

async function resolveOrderStore(
  orderNumber: string
): Promise<StoreBrandRow | null> {
  const { url } = getSupabaseConfig();

  if (!url || !orderNumber) return null;

  const orderUrl = new URL(`${url}/rest/v1/orders`);
  orderUrl.searchParams.set("select", "store_id");
  orderUrl.searchParams.set("order_number", `eq.${orderNumber}`);
  orderUrl.searchParams.set("limit", "1");

  const orders = await supabaseRest<OrderStoreRow[]>(orderUrl);
  const storeId = orders?.[0]?.store_id;

  if (!storeId) return null;

  const storeUrl = new URL(`${url}/rest/v1/stores`);
  storeUrl.searchParams.set("select", "name,logo_url,og_image_url");
  storeUrl.searchParams.set("id", `eq.${storeId}`);
  storeUrl.searchParams.set("limit", "1");

  const stores = await supabaseRest<StoreBrandRow[]>(storeUrl);
  return stores?.[0] || null;
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");

  return host ? `${protocol}://${host}` : "https://perlamarketplace.com";
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  const [store, origin] = await Promise.all([
    resolveOrderStore(orderNumber),
    getRequestOrigin(),
  ]);

  const storeName = store?.name?.trim() || FALLBACK_STORE_NAME;
  const title = `Pedido ${orderNumber} | ${storeName}`;
  const description = `Consulta el estado de tu pedido en ${storeName}.`;
  const image =
    store?.og_image_url?.trim() ||
    store?.logo_url?.trim() ||
    FALLBACK_IMAGE;
  const canonicalUrl = `${origin}/pedido/${encodeURIComponent(orderNumber)}`;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: storeName,
      type: "website",
      images: [
        {
          url: image,
          alt: `${storeName} - Pedido ${orderNumber}`,
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

export default async function PublicOrderPage({ params }: PageProps) {
  const { orderNumber } = await params;

  return <PublicOrderClient orderNumber={orderNumber} />;
}
