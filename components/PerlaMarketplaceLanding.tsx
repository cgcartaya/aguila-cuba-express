import PerlaHeader from "./perla/PerlaHeader";
import PerlaHero from "./perla/PerlaHero";
import PerlaFeatures from "./perla/PerlaFeatures";
import PerlaShowcase from "./perla/PerlaShowcase";
import PerlaHowItWorks from "./perla/PerlaHowItWorks";
import PerlaIndustries from "./perla/PerlaIndustries";
import PerlaPlans from "./perla/PerlaPlans";
import PerlaFAQ from "./perla/PerlaFAQ";
import PerlaCTA from "./perla/PerlaCTA";
import PerlaFooter from "./perla/PerlaFooter";

export default function PerlaMarketplaceLanding() {
  return <main className="min-h-screen overflow-x-hidden bg-white text-[#071044]"><PerlaHeader/><PerlaHero/><PerlaFeatures/><PerlaShowcase/><PerlaHowItWorks/><PerlaIndustries/><PerlaPlans/><PerlaFAQ/><PerlaCTA/><PerlaFooter/></main>;
}
