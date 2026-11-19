import type { Metadata } from "next";

import "./globals.css";
import { manrope } from "./fonts";

import { CartProvider } from "@/contexts/CartContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { buildPerlaMetadata } from "@/lib/saas/store-metadata";
import MetaPixel from "@/components/analytics/MetaPixel";
import RecoveryRedirect from "@/components/shareapp/RecoveryRedirect";
import ReferralTracker from "@/components/shareapp/ReferralTracker";
import InternalAnalyticsTracker from "@/components/analytics/InternalAnalyticsTracker";

// Public pages set their own sharing cards and canonical URLs. Keeping these
// out of the root prevents one tenant's links from inheriting platform branding.
const platformMetadata = buildPerlaMetadata();
export const metadata: Metadata = {
  metadataBase: platformMetadata.metadataBase,
  title: platformMetadata.title,
  icons: platformMetadata.icons,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${manrope.variable} h-full antialiased`}>
      <body>
        <RecoveryRedirect />
        <MetaPixel />
        <StoreProvider>
          <InternalAnalyticsTracker />
          <ReferralTracker />
          <CurrencyProvider>
            <CartProvider>{children}</CartProvider>
          </CurrencyProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
