export type WfLocale = "es" | "en";

export function wfLocale(value: unknown): WfLocale {
  return value === "en" ? "en" : "es";
}

export function wfCopy(locale: WfLocale) {
  return (spanish: string, english: string) => locale === "en" ? english : spanish;
}
