/* =========================================================
   DE PARIS — DATOS DE CONTACTO Y ENLACES
   -----------------------------------------------------------
   Reemplaza los valores marcados con TODO antes de publicar.
========================================================= */

export const WHATSAPP_PHONE = "5352994719";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "¡Hola De Paris! Quisiera más información."
)}`;

export const PHONE_DISPLAY = "+53 5299 4719";

// Ruta de la tienda dentro de Perla Marketplace (slug real: deparis)
export const STORE_URL = "/tienda/deparis";

// TODO: reemplazar por la dirección exacta del local en Cienfuegos
export const ADDRESS_LINE_1 = "Calle por confirmar";
export const ADDRESS_LINE_2 = "Cienfuegos, Cuba";
export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=De+Paris+Mercado+Cienfuegos+Cuba";

export const HOURS: { day: string; time: string }[] = [
  { day: "Lunes – Jueves", time: "10:00 am – 9:00 pm" },
  { day: "Viernes – Sábado", time: "10:00 am – 11:00 pm" },
  { day: "Domingo", time: "10:00 am – 6:00 pm" },
];

// TODO: reemplazar por las redes reales de De Paris
export const INSTAGRAM_URL = "https://instagram.com/deparis";
export const FACEBOOK_URL = "https://facebook.com/deparis";

export const NAV_LINKS = [
  ["Inicio", "#inicio"],
  ["Bar & Restaurante", "#bar-restaurante"],
  ["Mercado", "#mercado"],
  ["Menú", "#menu"],
  ["Contacto", "#contacto"],
] as const;
