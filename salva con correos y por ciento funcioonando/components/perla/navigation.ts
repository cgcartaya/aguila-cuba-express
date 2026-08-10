import {
  BarChart3,
  Boxes,
  CreditCard,
  Megaphone,
  PackageCheck,
  Puzzle,
  Route,
  ShoppingBag,
  Store,
  Truck,
  UsersRound,
  Warehouse,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export type NavigationGroup = {
  title: string;
  items: NavigationItem[];
};

export type MenuKey = "platform" | "solutions" | "resources";

export type PrimaryNavigationItem =
  | { type: "link"; label: string; href: string }
  | { type: "menu"; label: string; menu: MenuKey };

export const platformGroups: NavigationGroup[] = [
  {
    title: "Vender",
    items: [
      {
        label: "Tienda online",
        href: "#caracteristicas",
        description: "Crea tu tienda profesional en minutos.",
        icon: Store,
      },
      {
        label: "Inventario",
        href: "#caracteristicas",
        description: "Control en tiempo real y sincronizado.",
        icon: Boxes,
      },
      {
        label: "Pagos",
        href: "#como-funciona",
        description: "Recibe pagos de forma segura y rápida.",
        icon: CreditCard,
      },
      {
        label: "Marketing",
        href: "#caracteristicas",
        description: "Promociones, cupones y campañas efectivas.",
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
        description: "Gestiona todos tus pedidos desde un solo lugar.",
        icon: ShoppingBag,
      },
      {
        label: "Envíos",
        href: "#como-funciona",
        description: "Tarifas, guías y seguimiento en tiempo real.",
        icon: Truck,
      },
      {
        label: "Stock & almacenes",
        href: "#caracteristicas",
        description: "Multi-almacén y control de existencias.",
        icon: Warehouse,
      },
      {
        label: "Logística",
        href: "#como-funciona",
        description: "Reglas de envío, zonas y transportistas.",
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
        description: "Gestiona clientes y oportunidades.",
        icon: UsersRound,
      },
      {
        label: "Analytics",
        href: "#caracteristicas",
        description: "Reportes y métricas inteligentes.",
        icon: BarChart3,
      },
      {
        label: "Automatizaciones",
        href: "#como-funciona",
        description: "Flujos de trabajo que ahorran tiempo.",
        icon: WandSparkles,
      },
      {
        label: "Integraciones",
        href: "#caracteristicas",
        description: "Conecta tus herramientas favoritas.",
        icon: Puzzle,
      },
    ],
  },
];

export const solutions: NavigationItem[] = [
  {
    label: "Comercio y retail",
    href: "#industrias",
    description: "Tienda digital, catálogo, inventario y pedidos.",
    icon: Store,
  },
  {
    label: "Envíos y paquetería",
    href: "#industrias",
    description: "Operación logística, rastreo y facturación.",
    icon: Truck,
  },
  {
    label: "Servicios",
    href: "#industrias",
    description: "Cotizaciones, clientes y procesos internos.",
    icon: PackageCheck,
  },
];

export const resources: NavigationItem[] = [
  {
    label: "Casos reales",
    href: "#clientes",
    description: "Descubre cómo otras empresas usan Perla.",
    icon: UsersRound,
  },
  {
    label: "Documentación",
    href: "#como-funciona",
    description: "Guías para conocer cada módulo.",
    icon: Puzzle,
  },
  {
    label: "Vista general",
    href: "#caracteristicas",
    description: "Explora todo el ecosistema Perla Marketplace.",
    icon: BarChart3,
  },
];

export const primaryNavigation: PrimaryNavigationItem[] = [
  { type: "menu", label: "Plataforma", menu: "platform" },
  { type: "menu", label: "Soluciones", menu: "solutions" },
  { type: "link", label: "Clientes", href: "#clientes" },
  { type: "menu", label: "Recursos", menu: "resources" },
  { type: "link", label: "Precios", href: "#planes" },
];
