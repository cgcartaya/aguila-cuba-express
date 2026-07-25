import type { MarketingPromotionDestination } from "@/types/marketing";

const DEFAULT_COUNTRY_CODE = "1";

function removeInternationalPrefix(value: string) {
  return value.startsWith("00") ? value.slice(2) : value;
}

export function normalizePhoneNumber(value: string) {
  let digits = removeInternationalPrefix(value.replace(/\D/g, ""));

  // Para números de EE. UU. escritos sin código de país.
  if (digits.length === 10) digits = `${DEFAULT_COUNTRY_CODE}${digits}`;

  return digits;
}

export function normalizeWebUrl(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  if (/^https?:\/\//i.test(clean)) return clean;
  return `https://${clean}`;
}

function whatsappFromExistingUrl(value: string, message?: string | null) {
  try {
    const url = new URL(value);
    const supportedHost =
      url.hostname === "wa.me" ||
      url.hostname.endsWith("whatsapp.com") ||
      url.hostname.endsWith("whatsapp.net");

    if (!supportedHost) return null;
    if (message?.trim() && !url.searchParams.has("text")) {
      url.searchParams.set("text", message.trim());
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function buildPromotionDestination(
  type: MarketingPromotionDestination,
  value?: string | null,
  message?: string | null
) {
  const clean = value?.trim() ?? "";
  if (type === "none" || !clean) return null;

  if (type === "whatsapp") {
    const existing = whatsappFromExistingUrl(clean, message);
    if (existing) return existing;

    const phone = normalizePhoneNumber(clean);
    if (!phone) return null;

    const url = new URL(`https://wa.me/${phone}`);
    if (message?.trim()) url.searchParams.set("text", message.trim());
    return url.toString();
  }

  if (type === "call") {
    const phone = normalizePhoneNumber(clean);
    return phone ? `tel:+${phone}` : null;
  }

  if (type === "email") {
    const email = clean.replace(/^mailto:/i, "");
    if (!email.includes("@")) return null;
    const url = new URL(`mailto:${email}`);
    if (message?.trim()) url.searchParams.set("body", message.trim());
    return url.toString();
  }

  return normalizeWebUrl(clean);
}

export function destinationFieldCopy(type: MarketingPromotionDestination) {
  switch (type) {
    case "whatsapp":
      return {
        label: "Número de WhatsApp",
        placeholder: "+1 (803) 262-3676",
        help: "Puedes escribir el número con espacios o guiones. El enlace se genera automáticamente.",
        inputMode: "tel" as const,
      };
    case "call":
      return {
        label: "Número para llamar",
        placeholder: "+1 (803) 262-3676",
        help: "Al tocar el botón en un teléfono se abrirá la llamada.",
        inputMode: "tel" as const,
      };
    case "email":
      return {
        label: "Correo electrónico",
        placeholder: "info@empresa.com",
        help: "Al tocar el botón se abrirá la aplicación de correo.",
        inputMode: "email" as const,
      };
    case "url":
      return {
        label: "Página o enlace",
        placeholder: "https://empresa.com/oferta",
        help: "Si omites https://, el sistema lo añadirá.",
        inputMode: "url" as const,
      };
    default:
      return {
        label: "Destino",
        placeholder: "",
        help: "",
        inputMode: "text" as const,
      };
  }
}
