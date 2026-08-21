/* =========================================================
   JOTA JOTA — DATOS DE CONTACTO Y ENLACES
   -----------------------------------------------------------
   Reemplaza los valores marcados con TODO antes de publicar.
   Sigue el mismo patrón que components/landing/deparis/constants.ts
========================================================= */

// TODO: reemplazar por el WhatsApp real de Jota Jota
export const WHATSAPP_PHONE = "5350000000";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "¡Hola Jota Jota! Quisiera más información."
)}`;

// TODO: formato local, ej. "+53 5xxx xxxx"
export const PHONE_DISPLAY = "+53 5000 0000";

// Slug real de la tienda dentro de Perla Marketplace (ajusta si es distinto)
export const STORE_SLUG = "jotajota";
export const STORE_URL = `/tienda/${STORE_SLUG}`;
export const MENU_URL = `/menu/${STORE_SLUG}`;
export const RESERVAS_URL = `/reservas/${STORE_SLUG}`;

// TODO: reemplazar por la dirección real
export const ADDRESS_LINE_1 = "Calle 00 # 000, entre 0 y 0";
export const ADDRESS_LINE_2 = "Cuba";
export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(`${ADDRESS_LINE_1}, ${ADDRESS_LINE_2}`);

// TODO: ajustar horario real
export const HOURS: { day: string; time: string }[] = [
  { day: "Lunes – Jueves", time: "12:00 m – 10:00 pm" },
  { day: "Viernes – Sábado", time: "12:00 m – 11:30 pm" },
  { day: "Domingo", time: "12:00 m – 9:00 pm" },
];

// TODO: reemplazar por las redes reales de Jota Jota
export const INSTAGRAM_URL = "https://instagram.com/jotajota";
export const FACEBOOK_URL = "https://facebook.com/jotajota";

export const NAV_LINKS = [
  ["Inicio", "#inicio"],
  ["Pizzas", "#pizzas"],
  ["Cocina", "#cocina"],
  ["El horno", "#horno"],
  ["Reservas", "#reservas"],
  ["Contacto", "#contacto"],
] as const;

// Frases cortas para el ticker/marquesina — identidad napolitana del local.
export const MARQUEE_ITEMS = [
  "HORNO DE LEÑA",
  "MASA MADRE 48H",
  "RECETA NAPOLITANA",
  "FIOR DI LATTE",
  "COCCIÓN A 485°C",
  "HECHO A MANO",
];
