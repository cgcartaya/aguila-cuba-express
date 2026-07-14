export type WhatsAppApp = "business" | "personal";

export function cleanWhatsAppPhone(phone?: string | null) {
  if (!phone) return "";

  let cleaned = phone.replace(/\D/g, "");

  // Para números de Estados Unidos escritos con 10 dígitos.
  if (cleaned.length === 10) {
    cleaned = `1${cleaned}`;
  }

  return cleaned;
}

function isAndroid() {
  return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
}

function isIOS() {
  return (
    typeof navigator !== "undefined" &&
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

export function openWhatsAppMessage({
  app,
  phone,
  message,
}: {
  app: WhatsAppApp;
  phone: string;
  message: string;
}) {
  if (typeof window === "undefined") return;

  const cleanPhone = cleanWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message);

  if (!cleanPhone) {
    throw new Error("No hay un teléfono válido para abrir WhatsApp.");
  }

  if (app === "business") {
    if (isAndroid()) {
      // Abre específicamente el paquete de WhatsApp Business en Android.
      window.location.href =
        `intent://send?phone=${cleanPhone}&text=${encodedMessage}` +
        `#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
      return;
    }

    if (isIOS()) {
      // Esquema propio de WhatsApp Business en iPhone/iPad.
      window.location.href =
        `whatsapp-smb://send?phone=${cleanPhone}&text=${encodedMessage}`;
      return;
    }
  }

  if (app === "personal") {
    if (isAndroid()) {
      // Abre específicamente WhatsApp Messenger en Android.
      window.location.href =
        `intent://send?phone=${cleanPhone}&text=${encodedMessage}` +
        `#Intent;scheme=whatsapp;package=com.whatsapp;end`;
      return;
    }

    if (isIOS()) {
      window.location.href =
        `whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`;
      return;
    }
  }

  // En computadora abre WhatsApp Web. También sirve como alternativa general.
  window.open(
    `https://wa.me/${cleanPhone}?text=${encodedMessage}`,
    "_blank",
    "noopener,noreferrer"
  );
}
