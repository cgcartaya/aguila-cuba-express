import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { wfStore } from "@/lib/procedures/server";
import { normalizeStoreHost } from "@/lib/saas/store-metadata";
import LockerPortal from "./LockerPortal";

export const metadata: Metadata = {
  title: "Casillero Virtual | WF Cargo",
  robots: { index: false, follow: false },
};

export default async function LockerPage() {
  const host = normalizeStoreHost((await headers()).get("host") ?? "");
  const store = await wfStore();
  if (!store || (host !== "wf-cargo.perlamarketplace.com" &&
    (!store.domain || host !== normalizeStoreHost(store.domain)))) notFound();
  return <LockerPortal />;
}
