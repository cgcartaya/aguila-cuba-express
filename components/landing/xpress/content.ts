import type { StoreMetadataRow } from "@/lib/saas/store-metadata";

export const xpress = {
  name: "Xpress Multiservices Solutions Inc.",
  title: "Xpress Multiservices Solutions | Envíos a Cuba desde Hialeah",
  description: "Envíos Express, aéreos y marítimos a Cuba, cajas de precio fijo, frutas, congelados y productos para enviar desde Hialeah, Florida.",
  address: "4175 East 8th Ave, Hialeah, FL",
  hours: "Lunes a domingo, 9:00 a. m. – 6:00 p. m.",
  phones: [
    { label: "786-868-3883", number: "+17868683883" },
    { label: "305-795-4683", number: "+13057954683" },
  ],
  whatsapp: "+13057646865",
  whatsappLabel: "305-764-6865",
  image: "/xpress/og.jpg",
  hero: "/xpress/hero.webp?v=marca-1",
  boxesPhoto: "/xpress/boxes.webp?v=marca-1",
  lockerPhoto: "/xpress/locker.webp?v=marca-1",
  logo: "/xpress/logo.jpeg",
  favicon: "/xpress/favicon.png",
};

export function isXpressLanding(store: StoreMetadataRow | null): boolean {
  return store?.slug === "xpress" && store.has_landing === true;
}

export function xpressWhatsApp(message: string) {
  return `https://wa.me/${xpress.whatsapp.slice(1)}?text=${encodeURIComponent(message)}`;
}

export const boxes = [
  { size: "12×12×12", price: "$45" },
  { size: "15×15×15", price: "$65" },
  { size: "16×16×16", price: "$75" },
  { size: "24×12×12", price: "$75" },
  { size: "24×18×18", price: "$100" },
];

export const transportRates = [
  {
    id: "express",
    name: "Envíos Express a Cuba",
    price: "Desde $3.99/lb",
    time: "La Habana: 24–48 horas · Provincias: 5–7 días",
    rates: [
      ["Frutas frescas", "$3.99/lb"],
      ["Medicinas, alimentos, aseo y congelados", "$4.99/lb"],
      ["Misceláneas", "$5.99/lb"],
      ["Tablets y computadoras", "$50/unidad"],
      ["Teléfonos celulares", "$40/unidad"],
    ],
  },
  {
    id: "aereo",
    name: "Envíos aéreos de carga",
    price: "$2.75/lb",
    time: "Tiempo estimado: 10–15 días",
    rates: [["Carga aérea", "$2.75/lb"]],
  },
  {
    id: "maritimo",
    name: "Envíos marítimos por libra",
    price: "Desde $1.49/lb",
    time: "Tiempo estimado: 30–45 días",
    rates: [
      ["Alimentos, medicinas, aseo y misceláneas", "$1.49/lb"],
      ["Artículos duraderos", "$1.99/lb"],
    ],
  },
];

export const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(xpress.address)}`;
export const contactWhatsApp = xpressWhatsApp("Hola, quisiera información sobre los envíos a Cuba.");
const navigation = [
  ["Inicio", "#inicio"],
  ["Servicios", "#servicios"],
  ["Cotizador", "#cotizador"],
  ["Tienda virtual", "#tienda"],
  ["Casillero virtual", "/casillero"],
  ["Rastreo", "#rastreo"],
  ["Contacto", "#contacto"],
];

export function xpressNavigation(lockersEnabled: boolean) {
  return navigation.filter(([, href]) => lockersEnabled || href !== "/casillero");
}
