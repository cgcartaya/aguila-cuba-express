// Central content configuration. Images, prices and service links are edited here.
export const contact = {
  phone: "772-212-7150",
  whatsapp: "17725771507",
  email: "fournierinvestmentservicesllc@gmail.com",
};
export const whatsapp = (message: string) =>
  `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
export const shipping = {
  perPound: { sea: 1.99, air: 2.99, express: 4 },
  packagingPerVisit: 5,
  maxBoxWeight: 100,
  boxes: [
    { size: "14 × 14 × 14", price: 50 },
    { size: "15 × 15 × 15", price: 60 },
    { size: "16 × 16 × 16", price: 70 },
    { size: "18 × 18 × 18", price: 75 },
  ],
};
export const slides = [
  {
    tag: "Envíos a Cuba y Latinoamérica",
    title: "Más cerca de los tuyos.",
    description:
      `Marítimo a Cuba a $${shipping.perPound.sea.toFixed(2)}/lb o cajas desde $50, con entrega a domicilio incluida. Consulta cobertura y condiciones.`,
    image: "/wfcargo/banner-envios.webp",
    alt: "Cajas de envío con la marca WF Cargo frente a una calle de La Habana",
    label: "Cotizar mi envío",
    href: "#cotizador",
  },
  {
    tag: "Remesas a Cuba",
    title: "Tu apoyo llega donde más importa.",
    description:
      "Ayuda a tu familia desde Port St. Lucie. Consulta las opciones de remesas a Cuba y Latinoamérica con nuestro equipo.",
    image: "/wfcargo/banner-remesas.webp",
    alt: "Familia cubana compartiendo la confirmación de una remesa",
    label: "Ver cómo funcionan las remesas",
    href: "/remesas",
  },
  {
    tag: "Trámites sin fronteras",
    title: "Tus trámites, en buenas manos.",
    description:
      "Pasaportes cubanos, visa electrónica, autorizaciones de menores y documentos. Te orientamos sobre cada gestión.",
    image: "/wfcargo/banner-tramites.webp",
    alt: "Pasaporte cubano y documentos sobre un escritorio",
    label: "Explorar trámites",
    href: "#tramites",
  },
  {
    tag: "Disfruta tu próximo viaje",
    title: "Cuba te espera. Nosotros te ayudamos.",
    description:
      "Consulta disponibilidad de renta de autos y reservas de hotel para tu próxima visita a Cuba.",
    image: "/wfcargo/banner-autos.webp",
    alt: "Auto moderno junto al mar en La Habana",
    label: "Consultar disponibilidad",
    href: whatsapp("Hola, quisiera consultar la disponibilidad de autos y hoteles en Cuba."),
  },
];
export const procedures = [
  { name: "Visa electrónica", price: 85 },
  { name: "Pasaporte · Mayor de 16 años", price: 295 },
  { name: "Pasaporte · Menor de 16 años", price: 255 },
  { name: "Autorización de menor", price: 520 },
  { name: "DVT", price: 325 },
  { name: "Documento · Solo obtención", price: 250 },
  { name: "Documento + MINREX", price: 310 },
  { name: "Documento + consulado extranjero", price: 425 },
];
export const lockerWarehouse = {
  street: "10546 S US Hwy 1",
  cityLine: "Port St. Lucie, FL 34952",
  phone: contact.phone,
};
export const branches = [
  {
    name: "WF Cargo Envíos II · US 1",
    focus: "Tu conexión con Cuba",
    focusEn: "Your connection to Cuba",
    servicesEn: "Packages and money transfers to Cuba, pickups, Cuban document services, car rentals, and hotels.",
    address: `${lockerWarehouse.street}, ${lockerWarehouse.cityLine}`,
    phone: lockerWarehouse.phone,
    services:
      "Paquetería y remesas a Cuba, recogidas, trámites cubanos, renta de autos y hoteles.",
  },
  {
    name: "WF Cargo Envíos I · Bayshore",
    focus: "Conectados con Latinoamérica",
    focusEn: "Connected to Latin America",
    servicesEn: "Packages to the Dominican Republic and Colombia. Money transfers, Notary Public, and related services.",
    address: "1628 SW Bayshore Blvd, Port St. Lucie, FL 34984",
    phone: "772-877-2726",
    services:
      "Paquetería a República Dominicana y Colombia. Remesas, servicios de Notary Public y multiservicios.",
  },
];
const spanishFaqs = [
  [
    "¿Cómo envío un paquete?",
    "Visita una de nuestras sucursales o solicita una recogida para envíos a Cuba. Pesamos y empacamos tu envío y te entregamos el recibo.",
  ],
  [
    "¿La entrega a domicilio en Cuba está incluida?",
    "Sí. La tarifa marítima incluye entrega a domicilio en Cuba. Consulta la cobertura de la dirección de destino antes de enviar.",
  ],
  [
    "¿Hay cargos adicionales?",
    "Los materiales de empaque tienen un cargo de $5 por visita, que puede exonerarse. Los aranceles dependen del destino y del contenido. Consulta las condiciones y el valor declarado antes de confirmar.",
  ],
  [
    "¿Cuánto tarda en llegar mi envío?",
    "Consulta con nuestro equipo la próxima salida y el plazo estimado para tu destino. El tiempo de tránsito se cuenta desde la salida del contenedor.",
  ],
  [
    "¿Qué necesito para enviar?",
    "Identificación con foto y nombre, dirección y teléfono completos del destinatario. Confirma con la agencia los requisitos y artículos permitidos antes de preparar tu paquete.",
  ],
  [
    "¿Ofrecen asesoría legal o de inmigración?",
    "WF Cargo ofrece apoyo administrativo con formularios. Para asesoría legal o representación, consulta a un abogado autorizado.",
  ],
];

export const faqs = {
  es: spanishFaqs,
  en: [
    ["How do I ship a package?", "Visit one of our locations or request a pickup for shipments to Cuba. We weigh and pack your shipment and give you a receipt."],
    ["Is home delivery in Cuba included?", "Yes. Ocean shipping includes home delivery in Cuba. Confirm coverage for the destination address before shipping."],
    ["Are there additional fees?", "Packing materials cost $5 per visit and the fee may be waived. Customs duties depend on the destination and contents. Confirm the terms and declared value before shipping."],
    ["How long will delivery take?", "Ask our team about the next departure and estimated transit time for your destination. Transit time begins when the container departs."],
    ["What do I need to ship?", "Bring photo identification and the recipient’s full name, address, and phone number. Check requirements and permitted items with our team before packing."],
    ["Do you offer legal or immigration advice?", "WF Cargo provides administrative help with forms. For legal advice or representation, consult a licensed attorney."],
  ],
};

export const englishSlides = [
  {
    ...slides[0],
    tag: "Shipping to Cuba and Latin America",
    title: "Closer to your loved ones.",
    description: `Ocean shipping to Cuba from $${shipping.perPound.sea.toFixed(2)}/lb or boxes from $50, including home delivery. Ask about coverage and terms.`,
    alt: "WF Cargo shipping boxes in front of a Havana street",
    label: "Get a shipping quote",
  },
  {
    ...slides[1],
    tag: "Money transfers to Cuba",
    title: "Send support where it matters most.",
    description: "Support your family from Port St. Lucie. Ask our team about money transfer options to Cuba and Latin America.",
    alt: "Cuban family sharing a money transfer confirmation",
    label: "See how money transfers work",
    href: "/remesas?lang=en",
  },
  {
    ...slides[2],
    tag: "Document services",
    title: "Get help with your paperwork.",
    description: "We can guide you through Cuban passport requests, electronic visas, travel authorizations for minors, and other documents.",
    alt: "Cuban passport and documents on a desk",
    label: "Explore document services",
  },
  {
    ...slides[3],
    tag: "Plan your next trip",
    title: "Ready for your trip to Cuba?",
    description: "Ask about car rentals and hotel reservations for your next visit to Cuba.",
    alt: "Modern car next to the ocean in Havana",
    label: "Check availability",
    href: whatsapp("Hello, I’d like to check car rental and hotel availability in Cuba."),
  },
];
