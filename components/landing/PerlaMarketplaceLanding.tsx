import PerlaHeader from "@/components/perla/PerlaHeader";
import PerlaHero from "@/components/perla/PerlaHero";
import PerlaFeatures from "@/components/perla/PerlaFeatures";
import PerlaShowcase from "@/components/perla/PerlaShowcase";
import PerlaHowItWorks from "@/components/perla/PerlaHowItWorks";
import PerlaIndustries from "@/components/perla/PerlaIndustries";
import PerlaPlans from "@/components/perla/PerlaPlans";
import PerlaFAQ from "@/components/perla/PerlaFAQ";
import PerlaCTA from "@/components/perla/PerlaCTA";
import PerlaFooter from "@/components/perla/PerlaFooter";

export default function PerlaMarketplaceLanding() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#071044]">
      <PerlaHeader />
      <PerlaHero />
      <PerlaFeatures />
      <PerlaShowcase />
      <PerlaHowItWorks />
      <PerlaIndustries />
      <PerlaPlans />
      <PerlaFAQ />
      <PerlaCTA />
      <PerlaFooter />
    </main>
  );
}
