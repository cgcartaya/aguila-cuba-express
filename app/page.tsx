import { headers } from "next/headers";
import AguilaLanding from "@/components/landing/AguilaLanding";
import PerlaMarketplaceLanding from "@/components/landing/PerlaMarketplaceLanding";

function normalizeHost(host: string) {
  return host.replace(/^www\./, "").split(":")[0].toLowerCase().trim();
}

export default async function HomePage() {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ||
    headersList.get("host") ||
    "";

  const cleanHost = normalizeHost(host);

  if (cleanHost === "aguilacubaexpress.com") {
    return <AguilaLanding />;
  }

  return <PerlaMarketplaceLanding />;
}
