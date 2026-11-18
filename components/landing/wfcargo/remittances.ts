import type { WfLocale } from "./Language";

// Replace the date and rates together when WF Cargo confirms a new bulletin.
export const wfRemittanceRates = {
  month: 11,
  day: 9,
  mlc: 1.15,
  cupTransfer: 900,
  cupCash: 900,
} as const;

export const wfRemittanceCoverage = "https://billetera.cc/cobertura";

export function wfRemittancesHref(locale: WfLocale) {
  return locale === "en" ? "/remesas?lang=en" : "/remesas";
}

export function cashRemittanceFee(usd: number) {
  return usd < 100 ? 3 : Math.round(usd * 3) / 100;
}
