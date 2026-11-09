/** Print assets are selected by tenant slug, never by the displayed agency name. */
export function shippingPrintBrand(slug: string, fallbackLogo?: string | null) {
  if (slug === "alvarez-travel") return {
    compact: true, logoUrl: "/alvarez/invoice-logo.jpg",
    addressLines: ["1805 E 4th Ave", "Hialeah, FL 33010"],
  };
  if (slug === "aguila") return {
    compact: true, logoUrl: "/aguila/invoice-logo.jpg", addressLines: [],
  };
  return { compact: false, logoUrl: fallbackLogo || null, addressLines: [] };
}
