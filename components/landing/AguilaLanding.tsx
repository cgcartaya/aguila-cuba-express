import AguilaCTA from "./aguila/AguilaCTA";
import AguilaFooter from "./aguila/AguilaFooter";
import AguilaHero from "./aguila/AguilaHero";
import AguilaNavbar from "./aguila/AguilaNavbar";
import AguilaProcess from "./aguila/AguilaProcess";
import AguilaQuoteTracking from "./aguila/AguilaQuoteTracking";
import AguilaServices from "./aguila/AguilaServices";
import AguilaSocial from "./aguila/AguilaSocial";
import AguilaStoreStrip from "./aguila/AguilaStoreStrip";

export default function AguilaLanding() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f6f1e4] text-[#0d1b30]">
      <AguilaNavbar />
      <AguilaHero />
      <AguilaStoreStrip />
      <AguilaServices />
      <AguilaProcess />
      <AguilaQuoteTracking />
      <AguilaSocial />
      <AguilaCTA />
      <AguilaFooter />
    </main>
  );
}
