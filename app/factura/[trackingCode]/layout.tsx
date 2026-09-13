import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

import {
  buildStoreShippingInvoiceMetadata,
  normalizeStoreHost,
  resolveStoreByHost,
  resolveStoreBySlug,
  type StoreMetadataRow,
} from "@/lib/saas/store-metadata";
import { supabaseAdmin } from "@/lib/supabase-admin";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ trackingCode: string }>;
};

async function resolveShipmentStore(code: string): Promise<StoreMetadataRow | null> {
  const normalizedCode = decodeURIComponent(code)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

  if (!/^ACE-[A-Z0-9]{6,12}$/.test(normalizedCode)) return null;

  const { data: shipment } = await supabaseAdmin
    .from("shipments")
    .select("store_id")
    .ilike("tracking_code", normalizedCode)
    .is("deleted_at", null)
    .maybeSingle();

  if (!shipment?.store_id) return null;

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select(
      "id,name,slug,subdomain,domain,logo_url,favicon_url,meta_title,meta_description,og_image_url,store_og_image_url,order_og_image_url,tracking_og_image_url,is_active,has_landing"
    )
    .eq("id", shipment.store_id)
    .maybeSingle();

  return (store as StoreMetadataRow | null) || null;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { trackingCode } = await params;
  const requestHeaders = await headers();
  const host = normalizeStoreHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || ""
  );
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const canonicalUrl = `${protocol}://${
    host || "aguilaexpressusa.com"
  }/factura/${encodeURIComponent(trackingCode)}`;
  const shipmentStore = await resolveShipmentStore(trackingCode);
  const store =
    shipmentStore ||
    (host ? await resolveStoreByHost(host) : null) ||
    (await resolveStoreBySlug("aguila"));

  if (!store) {
    return {
      title: `Factura del envío ${decodeURIComponent(trackingCode).toUpperCase()}`,
      description: "Consulta o descarga la factura de tu envío.",
      robots: { index: false, follow: false },
    };
  }

  return buildStoreShippingInvoiceMetadata(
    store,
    canonicalUrl,
    decodeURIComponent(trackingCode)
  );
}

export default function ShippingInvoiceLayout({ children }: LayoutProps) {
  return children;
}
