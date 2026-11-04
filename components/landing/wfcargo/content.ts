// Central content configuration. Images, prices and service links are edited here.
export const contact = {
  phone: "772-212-7150",
  whatsapp: "17725771507",
  email: "fournierinvestmentservicesllc@gmail.com",
};
export const whatsapp = (message: string) =>
  `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
export const shipping = {
  perPound: 1.5,
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
      "Marítimo a Cuba a $1.50/lb o cajas desde $50, con entrega a domicilio incluida. Consulta cobertura y condiciones.",
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
    label: "Consultar remesas",
    href: "#remesas",
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
    href: "#viajes",
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
export const branches = [
  {
    name: "WF Cargo Envíos II · US 1",
    focus: "Tu conexión con Cuba",
    address: "10546 S US Hwy 1, Port St. Lucie, FL 34952",
    phone: "772-212-7150",
    services:
      "Paquetería y remesas a Cuba, recogidas, trámites cubanos, renta de autos y hoteles.",
  },
  {
    name: "WF Cargo Envíos I · Bayshore",
    focus: "Conectados con Latinoamérica",
    address: "1628 SW Bayshore Blvd, Port St. Lucie, FL 34984",
    phone: "772-877-2726",
    services:
      "Paquetería a República Dominicana y Colombia. Remesas, notaría y multiservicios.",
  },
];
export const faqs = [
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
    "No ofrecemos asesoría legal ni de inmigración. Somos oficina de notaría pública y ofrecemos llenado de formularios. Para asesoría legal podemos conectarte con abogados de inmigración.",
  ],
];
