import { PHONE_COUNTRIES } from "@/lib/constants/phone-countries";

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
