import { mapUrl, xpress } from "./content";
import XpressContact, { XpressFooter } from "./XpressContact";
import XpressHeader from "./XpressHeader";
import XpressHero from "./XpressHero";
import XpressServices from "./XpressServices";
import XpressShippingSupport from "./XpressShippingSupport";
import XpressSpecialServices from "./XpressSpecialServices";
import styles from "./xpress.module.css";

type Props = { logoUrl?: string | null; storeSlug?: string; lockersEnabled?: boolean; canonicalUrl?: string };

export default function XpressLanding({ logoUrl, storeSlug, canonicalUrl, lockersEnabled = false }: Props) {
  const logo = logoUrl || xpress.logo;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: xpress.name,
    url: canonicalUrl,
    logo: canonicalUrl ? new URL(logo, canonicalUrl).href : undefined,
    telephone: xpress.phones[0].number,
    address: { "@type": "PostalAddress", streetAddress: "4175 East 8th Ave", addressLocality: "Hialeah", addressRegion: "FL", addressCountry: "US" },
    openingHours: "Mo-Su 09:00-18:00",
    hasMap: mapUrl,
  };

  return (
    <main id="inicio" className={styles.page}>
      {canonicalUrl && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />}
      <XpressHeader logoUrl={logo} lockersEnabled={lockersEnabled} />
      <XpressHero logoUrl={logo} lockersEnabled={lockersEnabled} />
      <XpressServices lockersEnabled={lockersEnabled} />
      <div className={styles.wrap}>
        <XpressSpecialServices hasStore={Boolean(storeSlug)} />
        <XpressShippingSupport lockersEnabled={lockersEnabled} />
        <XpressContact />
      </div>
      <XpressFooter lockersEnabled={lockersEnabled} />
    </main>
  );
}
