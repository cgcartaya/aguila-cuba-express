import type { Metadata } from "next";
import { headers } from "next/headers";
import { cache } from "react";
import TrackingView from "@/components/tracking/TrackingView";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  buildStoreTrackingMetadata,
  normalizeStoreHost,
  resolveStoreByHost,
  resolveStoreBySlug,
  type StoreMetadataRow,
} from "@/lib/saas/store-metadata";

type PageProps = { params: Promise<{ codigo: string }> };

const loadTrackingStore = cache(async (code: string): Promise<StoreMetadataRow | null> => {
  const normalizedCode = decodeURIComponent(code).trim().toUpperCase().replace(/\s+/g, "");
  if (!/^ACE-[A-Z0-9]{6,12}$/.test(normalizedCode)) return null;

  const { data: shipment } = await supabaseAdmin
    .from("shipments")
    .select("store_id")
    .ilike("tracking_code", normalizedCode)
    .is("deleted_at", null)
    .eq("public_tracking_enabled", true)
    .maybeSingle();

  if (!shipment?.store_id) return null;

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id,name,slug,subdomain,domain,logo_url,favicon_url,meta_title,meta_description,og_image_url,store_og_image_url,order_og_image_url,tracking_og_image_url,is_active,has_landing")
    .eq("id", shipment.store_id)
    .maybeSingle();

  return (store as StoreMetadataRow | null) || null;
});

async function getRequestUrl(code: string) {
  const requestHeaders = await headers();
  const host = normalizeStoreHost(
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || ""
  );
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");

  return {
    host,
    url: `${protocol}://${host || "aguilaexpressusa.com"}/rastrear/${encodeURIComponent(code)}`,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { codigo } = await params;
  const [{ host, url }, shipmentStore] = await Promise.all([
    getRequestUrl(codigo),
    loadTrackingStore(codigo),
  ]);
  const store = shipmentStore ||
    (host ? await resolveStoreByHost(host) : null) ||
    (await resolveStoreBySlug("aguila"));

  if (!store) {
    return {
      title: `Rastrea tu envío ${decodeURIComponent(codigo).toUpperCase()}`,
      description: "Consulta el estado y las actualizaciones de tu envío.",
      robots: { index: false, follow: false },
    };
  }

  return buildStoreTrackingMetadata(store, url, decodeURIComponent(codigo));
}

export default async function TrackingCodePage({ params }: PageProps) {
  const { codigo } = await params;
  return <TrackingView code={decodeURIComponent(codigo)} />;
}
