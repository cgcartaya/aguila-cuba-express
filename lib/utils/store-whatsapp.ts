import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, type PhoneCountry } from "@/lib/constants/phone-countries";

/** Canonical international WhatsApp number, without + or formatting. */
export function normalizeStoreWhatsapp(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const input = value.trim();
  const digits = input.replace(/\D/g, "");
  if (!digits || digits.length > 15) return null;
  // Accept international numbers with + or 00. Never assume a default country.
  const international = input.startsWith("00") ? digits.slice(2) : digits;
  if (!international || international.length > 15) return null;
  const countries = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const match = countries.find((country) =>
    international.startsWith(country.dialCode.slice(1)) &&
    international.length === country.dialCode.length - 1 + country.digits
  );
  return match ? international : null;
}

/** Split saved international numbers (including legacy digits-only values).
 * Bare national numbers stay national; only complete international numbers
 * can be interpreted as having a country prefix.
 */
export function splitPhone(fullValue: string, preferredCountry = DEFAULT_PHONE_COUNTRY): {
  country: PhoneCountry; nationalNumber: string;
} {
  const input = fullValue.trim();
  const digits = input.replace(/\D/g, "");
  const explicit = input.startsWith("+") || input.startsWith("00");
  const international = input.startsWith("00") ? digits.slice(2) : digits;
  const candidates = [...PHONE_COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  const matches = (country: PhoneCountry) =>
    international.startsWith(country.dialCode.slice(1)) &&
    (explicit || international.length === country.dialCode.length - 1 + country.digits);
  const country = matches(preferredCountry) ? preferredCountry : candidates.find(matches);
  if (country) {
    return { country, nationalNumber: international.slice(country.dialCode.length - 1) };
  }
  return { country: preferredCountry, nationalNumber: digits };
}
