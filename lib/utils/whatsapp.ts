export type WhatsAppApp = "business" | "personal";

export function cleanWhatsAppPhone(phone?: string | null) {
  if (!phone) return "";

  const hasExplicitCountryCode = phone.trim().startsWith("+");
  let cleaned = phone.replace(/\D/g, "");

  // Solo asumimos Estados Unidos por defecto cuando el número NO trae
  // su propio código de país (ej. viene de un campo viejo de puro
  // texto libre). Si ya viene con "+" (ej. "+53 52994719" desde
  // PhoneCountryField), son sus propios dígitos — anteponer "1" a
  // ciegas rompía números de otros países que por coincidencia
  // también suman 10 dígitos (como Cuba: 2 dígitos de código + 8 del
  // número nacional).
  if (!hasExplicitCountryCode && cleaned.length === 10) {
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

// Igual que openWhatsAppMessage, pero SIN destinatario fijo — para cuando
// se quiere compartir algo (ej. una orden a un repartidor) dejando que
// quien comparte elija el chat o grupo, en vez de mandárselo a un
// teléfono específico. La diferencia con simplemente abrir wa.me/?text=
// es que esto sí respeta si Frank usa WhatsApp Business: en vez de dejar
// que el sistema operativo decida cuál de las dos apps abrir (si tiene
// las dos instaladas puede abrir la que no es), se apunta directo al
// paquete/esquema de la app elegida.
export function openWhatsAppShare({
  app,
  message,
}: {
  app: WhatsAppApp;
  message: string;
}) {
  if (typeof window === "undefined") return;

  const encodedMessage = encodeURIComponent(message);

  if (app === "business") {
    if (isAndroid()) {
      window.location.href =
        `intent://send?text=${encodedMessage}` +
        `#Intent;scheme=whatsapp;package=com.whatsapp.w4b;end`;
      return;
    }

    if (isIOS()) {
      window.location.href = `whatsapp-smb://send?text=${encodedMessage}`;
      return;
    }
  }

  if (app === "personal") {
    if (isAndroid()) {
      window.location.href =
        `intent://send?text=${encodedMessage}` +
        `#Intent;scheme=whatsapp;package=com.whatsapp;end`;
      return;
    }

    if (isIOS()) {
      window.location.href = `whatsapp://send?text=${encodedMessage}`;
      return;
    }
  }

  // Computadora / apps no detectadas por esquema: WhatsApp Web deja
  // elegir el chat igual, sin importar si en el celular es Business o no.
  window.open(
    `https://wa.me/?text=${encodedMessage}`,
    "_blank",
    "noopener,noreferrer"
  );
}
