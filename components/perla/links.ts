export const DEMO_PATH = "/demo";
export const ADMIN_PATH = "/admin";
export const WHATSAPP_PHONE = "17862031226";
export const CONTACT_EMAIL = "carlosgarciacartaya@gmail.com";

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}
