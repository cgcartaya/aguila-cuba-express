import PerlaHeader from "./perla/PerlaHeader";
import PerlaHero from "./perla/PerlaHero";
import PerlaFeatures from "./perla/PerlaFeatures";
import PerlaHowItWorks from "./perla/PerlaHowItWorks";
import PerlaPlans from "./perla/PerlaPlans";
import PerlaClients from "./perla/PerlaClients";
import PerlaCTA from "./perla/PerlaCTA";
import PerlaFooter from "./perla/PerlaFooter";

export default function PerlaMarketplaceLanding() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#071044]">
      <PerlaHeader />
      <PerlaHero />
      <PerlaFeatures />
      <PerlaHowItWorks />
      <PerlaPlans />
      <PerlaClients />
      <PerlaCTA />
      <PerlaFooter />
    </main>
  );
}