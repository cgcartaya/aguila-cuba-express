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

// Bar & Restaurante y Mercado son dos locales físicos distintos en
// Cienfuegos — cada uno con su propia dirección y enlace de mapa.
export const RESTAURANT_ADDRESS_LINE_1 = "Calle 31 # 5212, entre 52 y 54";
export const RESTAURANT_ADDRESS_LINE_2 = "Cienfuegos, Cuba";
export const RESTAURANT_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Calle 31 # 5212 entre 52 y 54, Cienfuegos, Cuba");

export const MARKET_ADDRESS_LINE_1 = "Calle 29 # 4819, entre 48 y 50";
export const MARKET_ADDRESS_LINE_2 = "Cienfuegos, Cuba";
export const MARKET_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Calle 29 # 4819 entre 48 y 50, Cienfuegos, Cuba");

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
  ["Restaurante", "#restaurante"],
  ["Bar", "#bar"],
  ["Mercado", STORE_URL],
  ["Menú", "#menu"],
  ["Contacto", "#contacto"],
] as const;
