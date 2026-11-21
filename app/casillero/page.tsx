import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { resolveLockerStore } from "@/lib/lockers/server";
import { wfSlug } from "@/lib/procedures/server";
import LockerPortal from "./LockerPortal";

export const metadata: Metadata = {
  title: { absolute: "Casillero virtual" },
  description: "Accede a tu casillero virtual y consulta tus paquetes.",
  robots: { index: false, follow: false },
};

export default async function LockerPage() {
  const store = await resolveLockerStore((await headers()).get("host") ?? "");
  if (!store) notFound();
  return <LockerPortal
    name={store.name}
    logoUrl={store.logo_url}
    receivingAddress={store.locker_receiving_address}
    whatsappNumber={store.locker_whatsapp}
    legacyWf={store.slug === wfSlug}
  />;
}
