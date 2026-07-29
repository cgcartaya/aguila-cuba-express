import {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  FileText,
  Globe2,
  LayoutDashboard,
  Megaphone,
  PackageCheck,
  Route,
  ShoppingBag,
  Sparkles,
  Store,
  UsersRound,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  description?: string;
  icon?: LucideIcon;
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

export const platformGroups: NavigationGroup[] = [
  {
    title: "Vender",
    items: [
      {
        label: "Ecommerce",
        href: "#caracteristicas",
        description: "Tienda, catálogo y experiencia de compra.",
        icon: Store,
      },
      {
        label: "Checkout",
        href: "#como-funciona",
        description: "Formularios y métodos de entrega configurables.",
        icon: CreditCard,
      },
      {
        label: "Marketing",
        href: "#caracteristicas",
        description: "Promociones, banners y contenido comercial.",
        icon: Megaphone,
      },
    ],
  },
  {
    title: "Operar",
    items: [
      {
        label: "Pedidos",
        href: "#como-funciona",
        description: "Controla el ciclo completo de cada orden.",
        icon: PackageCheck,
      },
      {
        label: "Inventario",
        href: "#caracteristicas",
        description: "Stock, entradas, ajustes y movimientos.",
        icon: Boxes,
      },
      {
        label: "Logística",
        href: "#como-funciona",
        description: "Recogidas, rutas, envíos y seguimiento.",
        icon: Route,
      },
    ],
  },
  {
    title: "Crecer",
    items: [
      {
        label: "CRM",
        href: "#caracteristicas",
        description: "Clientes, historial y oportunidades.",
        icon: UsersRound,
      },
      {
        label: "Analytics",
        href: "#caracteristicas",
        description: "Métricas para decidir con información real.",
        icon: BarChart3,
      },
      {
        label: "Automatizaciones",
        href: "#como-funciona",
        description: "Reduce tareas repetitivas y errores manuales.",
        icon: WandSparkles,
      },
    ],
  },
];

export const solutions: NavigationItem[] = [
  {
    label: "Comercio y retail",
    href: "#industrias",
    description: "Venta digital, catálogo, inventario y pedidos.",
    icon: ShoppingBag,
  },
  {
    label: "Envíos y paquetería",
    href: "#industrias",
    description: "Operación logística, rastreo y facturación.",
    icon: Globe2,
  },
  {
    label: "Servicios",
    href: "#industrias",
    description: "Cotizaciones, clientes y procesos internos.",
    icon: Building2,
  },
];

export const resources: NavigationItem[] = [
  {
    label: "Casos reales",
    href: "#clientes",
    description: "Mira cómo empresas usan la plataforma.",
    icon: Sparkles,
  },
  {
    label: "Documentación",
    href: "#como-funciona",
    description: "Conoce el funcionamiento de cada módulo.",
    icon: FileText,
  },
  {
    label: "Vista general",
    href: "#caracteristicas",
    description: "Explora el ecosistema Perla Marketplace.",
    icon: LayoutDashboard,
  },
];

export const primaryNavigation = [
  { label: "Plataforma", menu: "platform" as const },
  { label: "Soluciones", menu: "solutions" as const },
  { label: "Clientes", href: "#clientes" },
  { label: "Recursos", menu: "resources" as const },
  { label: "Precios", href: "#planes" },
];

export type MenuKey = "platform" | "solutions" | "resources";
