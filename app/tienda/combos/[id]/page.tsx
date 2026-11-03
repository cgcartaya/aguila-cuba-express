import { headers } from "next/headers";
import { resolveStoreByHost, resolveStoreBySlug } from "@/lib/saas/store-metadata";
import { generateComboMetadata as itemMetadata } from "@/lib/storefront/combo-metadata";
import Client from "./ComboDetailClient";

type Props = { params: Promise<{ id: string }> };
export async function generateMetadata({params}: Props) {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") || "";
  const store = await resolveStoreByHost(host) || (host.split(":")[0] === "perlamarketplace.com" ? await resolveStoreBySlug("aguila") : null);
  if (!store) return { title: "Artículo no disponible", robots: { index: false, follow: false } };
  const {id} = await params;
  return itemMetadata({params: Promise.resolve({slug:store.slug,id})});
}
export default function Page(props: Props) { return <Client {...props} />; }
