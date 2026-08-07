import { Fraunces } from "next/font/google";

/**
 * Display serif used only for emphasis words in the Águila landing
 * (hero headline accent, section eyebrows-of-honor, waybill wordmark).
 * Paired with the site's existing Manrope (see @/app/fonts) which
 * carries every other weight of the page.
 */
export const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  style: ["normal", "italic"],
  weight: "variable",
  display: "swap",
  variable: "--font-fraunces",
});
