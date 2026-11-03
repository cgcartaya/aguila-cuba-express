import { getStorePublicBaseUrl } from "@/lib/saas/store-metadata";
import type { StoreMetadataRow } from "@/lib/saas/store-metadata";

export function getItemPublicUrl(store: StoreMetadataRow, id: string, kind: "producto" | "combos") {
  const ownHost = Boolean(store.domain?.trim() || store.subdomain?.trim());
  const prefix = ownHost ? (store.has_landing ? "/tienda" : "") : "";
  return `${getStorePublicBaseUrl(store)}${prefix}/${kind}/${encodeURIComponent(id)}`;
}
