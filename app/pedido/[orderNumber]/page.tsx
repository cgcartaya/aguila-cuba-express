import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { PublicOrderClient } from "./PublicOrderClient";

type PageProps = {
  params: Promise<{ orderNumber: string }>;
};

type OrderRow = {
  id: string;
  order_number: string | null;
  status: string;
  payment_status?: string | null;
  payment_method?: string | null;
  subtotal: number | null;
  delivery_fee: number | null;
  discount_amount?: number | null;
  total: number | null;
  country?: string | null;
  state?: string | null;
  municipality: string | null;
  zone_name: string | null;
  exact_address: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_phone_alt?: string | null;
  notes?: string | null;
  created_at: string;
  store_id: string | null;
};

type OrderItemRow = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  item_type: "product" | "combo";
};

type StoreBrandRow = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  og_image_url: string | null;
  store_og_image_url: string | null;
  order_og_image_url: string | null;
};

type PublicOrderData = {
  order: OrderRow;
  items: OrderItemRow[];
  store: StoreBrandRow | null;
};

const FALLBACK_STORE_NAME = "Perla Marketplace";
const FALLBACK_IMAGE = "/og-image.jpg";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findOrder(orderNumber: string): Promise<OrderRow | null> {
  const supabase = getAdminSupabase();
  if (!supabase || !orderNumber) return null;

  const decoded = decodeURIComponent(orderNumber).trim();

  const byNumber = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", decoded)
    .maybeSingle();

  if (byNumber.data) return byNumber.data as OrderRow;

  // Muchas instalaciones antiguas usan el UUID de la orden como enlace público.
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(decoded)) return null;

  const byId = await supabase
    .from("orders")
    .select("*")
    .eq("id", decoded)
    .maybeSingle();

  return (byId.data as OrderRow | null) || null;
}

const loadPublicOrder = cache(async (orderNumber: string): Promise<PublicOrderData | null> => {
  const supabase = getAdminSupabase();
  if (!supabase) {
    console.error("Pedido público: falta SUPABASE_SERVICE_ROLE_KEY.");
    return null;
  }

  const order = await findOrder(orderNumber);
  if (!order) return null;

  const [itemsResult, storeResult] = await Promise.all([
    supabase
      .from("order_items")
      .select("id,product_name,quantity,price,subtotal,item_type")
      .eq("order_id", order.id)
      .order("id", { ascending: true }),
    order.store_id
      ? supabase
          .from("stores")
          .select("id,name,slug,logo_url,og_image_url,store_og_image_url,order_og_image_url")
          .eq("id", order.store_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (itemsResult.error) {
    console.error("Pedido público: error cargando productos.", itemsResult.error);
  }
  if (storeResult.error) {
    console.error("Pedido público: error cargando tienda.", storeResult.error);
  }

  return {
    order,
    items: (itemsResult.data || []) as OrderItemRow[],
    store: (storeResult.data as StoreBrandRow | null) || null,
  };
});

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host?.includes("localhost") ? "http" : "https");

  return host ? `${protocol}://${host}` : "https://perlamarketplace.com";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  const [data, origin] = await Promise.all([
    loadPublicOrder(orderNumber),
    getRequestOrigin(),
  ]);

  const publicNumber = data?.order.order_number || data?.order.id || orderNumber;
  const storeName = data?.store?.name?.trim() || FALLBACK_STORE_NAME;
  const title = `Pedido ${publicNumber} | ${storeName}`;
  const description = `Consulta el estado de tu pedido en ${storeName}.`;
  const image =
    data?.store?.order_og_image_url?.trim() ||
    data?.store?.store_og_image_url?.trim() ||
    data?.store?.og_image_url?.trim() ||
    data?.store?.logo_url?.trim() ||
    FALLBACK_IMAGE;
  const canonicalUrl = `${origin}/pedido/${encodeURIComponent(publicNumber)}`;

  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: storeName,
      type: "website",
      images: [{ url: image, alt: `${storeName} - Pedido ${publicNumber}` }],
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
  const [data, origin] = await Promise.all([
    loadPublicOrder(orderNumber),
    getRequestOrigin(),
  ]);

  return (
    <PublicOrderClient
      requestedOrderNumber={orderNumber}
      initialData={data}
      pageUrl={`${origin}/pedido/${encodeURIComponent(
        data?.order.order_number || data?.order.id || orderNumber
      )}`}
    />
  );
}
