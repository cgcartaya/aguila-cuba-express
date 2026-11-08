import ModularLanding from "@/components/landing/perla/ModularLanding";
import { getPerlaShowcase } from "@/lib/services/perla-showcase";

export default async function PerlaMarketplaceLanding() {
  return <ModularLanding clients={await getPerlaShowcase()} />;
}
