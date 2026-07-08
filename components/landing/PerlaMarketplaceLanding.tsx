import PerlaHeader from "@/components/landing/perla/PerlaHeader";
import PerlaHero from "@/components/landing/perla/PerlaHero";
import PerlaFeatures from "@/components/landing/perla/PerlaFeatures";
import PerlaHowItWorks from "@/components/landing/perla/PerlaHowItWorks";
import PerlaClients from "@/components/landing/perla/PerlaClients";
import PerlaCTA from "@/components/landing/perla/PerlaCTA";
import PerlaFooter from "@/components/landing/perla/PerlaFooter";

export default function PerlaMarketplaceLanding() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050b18] text-white">
      <PerlaHeader />
      <PerlaHero />
      <PerlaFeatures />
      <PerlaHowItWorks />
      <PerlaClients />
      <PerlaCTA />
      <PerlaFooter />
    </main>
  );
}
