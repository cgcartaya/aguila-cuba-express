import {
  Banknote,
  Box,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  MessageCircle,
  PackageCheck,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  type LucideIcon,
} from "lucide-react";

export const WHATSAPP_URL = "https://wa.me/13054974891";
export const STORE_URL = "/tienda";
export const TRACKING_URL = "/rastrear";
export const PORTAL_URL = "/portal/mis-envios";

// TODO: reemplazar con las URLs reales de Aguila Express USA.
export const FACEBOOK_URL = "https://www.facebook.com/share/1GtPMTG7wm/";
export const INSTAGRAM_URL = "https://www.instagram.com/aguilaexpressusa?igsh=aHJsNm5rZDM5OXQ4";
export const TIKTOK_URL = "https://www.tiktok.com/@aguilaexpressusa?_r=1&_t=ZT-98gaSdaYPUL";

export const NAV_LINKS = [
  { label: "Inicio", href: "/" },
  { label: "Servicios", href: "#servicios" },
  { label: "Cómo funciona", href: "#proceso" },
  { label: "Rastreo", href: "#rastreo" },
  { label: "Mis envíos", href: PORTAL_URL },
];

export type ServiceItem = {
  icon: LucideIcon;
  number: string;
  title: string;
  description: string;
};

export const SERVICES: ServiceItem[] = [
  {
    icon: Box,
    number: "01",
    title: "Paquetería puerta a puerta",
    description:
      "Recogemos, empacamos y organizamos tu envío, con seguimiento activo durante todo el recorrido.",
  },
  {
    icon: ShoppingBag,
    number: "02",
    title: "Compra desde la tienda",
    description:
      "Elige productos para los tuyos y coordina compra y envío desde el mismo lugar, sin duplicar pasos.",
  },
  {
    icon: Banknote,
    number: "03",
    title: "Envío de dinero",
    description:
      "Un proceso claro y acompañado para ayudar a quienes más quieres, estén donde estén.",
  },
];

export const STORE_CATEGORIES = [
  { icon: ShoppingBag, label: "Alimentos" },
  { icon: Sparkles, label: "Aseo" },
  { icon: Shirt, label: "Ropa y hogar" },
  { icon: PackageCheck, label: "Combos" },
  { icon: HeartHandshake, label: "Regalos" },
  { icon: Store, label: "Misceláneas" },
];

export const PROCESS_STEPS = [
  { icon: MessageCircle, title: "Nos escribes", text: "Cuéntanos qué deseas enviar o comprar." },
  { icon: PackageCheck, title: "Preparamos", text: "Registramos y organizamos tu operación." },
  { icon: Truck, title: "Enviamos", text: "Tu paquete avanza con estados actualizados en tiempo real." },
  { icon: CheckCircle2, title: "Entregamos", text: "Confirmamos la entrega a quien tú digas." },
];

export const TRACKING_STAGES: [string, LucideIcon][] = [
  ["Recibido", PackageCheck],
  ["Preparando", Clock3],
  ["En tránsito", Truck],
  ["Entregado", CheckCircle2],
];

export const RATE_PER_LB = 6;
