/* =========================================================
   JOTA JOTA — DATOS DE CONTACTO Y ENLACES
========================================================= */

export const WHATSAPP_PHONE = "5350980360";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
  "¡Hola Jota Jota! Quisiera más información."
)}`;

export const PHONE_DISPLAY = "+53 5342 1943";
export const PHONE_URL = "tel:+5353421943";

export const WHATSAPP_DISPLAY = "+53 5098 0360";

export const STORE_SLUG = "jotajota";
export const MENU_URL = `/menu/${STORE_SLUG}`;
export const RESERVAS_URL = `/reservas/${STORE_SLUG}`;

export const ADDRESS_LINE_1 = "Av 5 de Septiembre #5501 / 55 y 57";
export const ADDRESS_LINE_2 = "Cienfuegos, Cienfuegos";
export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(`${ADDRESS_LINE_1}, ${ADDRESS_LINE_2}`);

export const HOURS: { day: string; time: string }[] = [
  { day: "Lunes – Jueves", time: "12:00 m – 10:00 pm" },
  { day: "Viernes – Sábado", time: "12:00 m – 11:30 pm" },
  { day: "Domingo", time: "12:00 m – 9:00 pm" },
];

export const INSTAGRAM_URL = "https://instagram.com/jotajota";
export const FACEBOOK_URL = "https://facebook.com/jotajota";

export const NAV_LINKS = [
  ["Inicio", "#inicio"],
  ["Pizzas", "#pizzas"],
  ["Cocina", "#cocina"],
  ["Reservas", "#reservas"],
  ["Contacto", "#contacto"],
] as const;

export const MARQUEE_ITEMS = [
  "PIZZAS",
  "PASTAS",
  "APERITIVOS",
  "POSTRES",
  "COCTELES",
  "CAFÉ",
  "SABORES PARA COMPARTIR",
];
