import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { wfStore } from "@/lib/procedures/server";
import { isWfCargoHost } from "@/lib/saas/wfcargo-hosts";
import { normalizeStoreHost } from "@/lib/saas/store-metadata";
import { buildWfCargoPageMetadata } from "@/components/landing/wfcargo/metadata";
import LockerPortal from "./LockerPortal";

export const metadata: Metadata = buildWfCargoPageMetadata(
  "/casillero",
  "Casillero Virtual | WF Cargo Envíos",
  "Abre tu casillero virtual de WF Cargo, recibe compras en Estados Unidos y consulta el estado de tus paquetes.",
);

export default async function LockerPage() {
  const host = normalizeStoreHost((await headers()).get("host") ?? "");
  const store = await wfStore();
  if (!store || (!isWfCargoHost(host) &&
    (!store.domain || host !== normalizeStoreHost(store.domain)))) notFound();
  return <LockerPortal />;
}
