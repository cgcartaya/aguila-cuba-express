import type { ComponentType } from "react";
import {
  Boxes,
  Calculator,
  ClipboardCheck,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Layers3,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  CalendarDays,
  MapPin,
  Megaphone,
  Route,
  TrendingUp,
  Users,
  Utensils,
  Wallet,
  Wrench,
  BellRing,
  MessageSquareText,
  CalendarCheck2,
  Armchair,
  ChartNoAxesCombined,
  RadioTower,
  CircleDollarSign,
} from "lucide-react";

import type { AccessStore } from "@/lib/admin/access";

export type AdminModuleKey =
  | "store"
  | "pickups"
  | "shipping"
  | "menu"
  | "reservas"
  | "economy";

export type AdminLink = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

export type AdminSection = {
  title: string;
  module?: AdminModuleKey;
  links: AdminLink[];
};

export const adminNavSections: AdminSection[] = [
  {
    title: "Marketplace",
    module: "store",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Órdenes", icon: ShoppingCart },
      { href: "/admin/products", label: "Productos", icon: Package },
      { href: "/admin/products/resenas", label: "Reseñas", icon: MessageSquareText },
      { href: "/admin/combos", label: "Combos", icon: Layers3 },
      { href: "/admin/inventory", label: "Inventario", icon: Boxes },
      { href: "/admin/customers", label: "Clientes", icon: Users },
    ],
  },
  {
    title: "Economía",
    module: "economy",
    links: [
      {
        href: "/admin/economy",
        label: "Economía y rentabilidad",
        icon: CircleDollarSign,
      },
    ],
  },
  {
    title: "Analítica",
    links: [
      {
        href: "/admin/analytics",
        label: "Rendimiento de la tienda",
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    title: "Reportes",
    module: "store",
    links: [
      {
        href: "/admin/reportes/productos-mas-vendidos",
        label: "Productos más vendidos",
        icon: TrendingUp,
      },
    ],
  },
  {
    title: "Recogidas",
    module: "pickups",
    links: [
      { href: "/admin/pickups", label: "Solicitudes de recogida", icon: CalendarDays },
      { href: "/admin/pickups/routes", label: "Rutas de recogida", icon: Route },
      { href: "/admin/pickups/customers", label: "Clientes de recogida", icon: Users },
      { href: "/admin/pickups/zones", label: "Zonas y ciudades", icon: Layers3 },
      { href: "/admin/pickups/settings", label: "Configurar cobertura", icon: MapPin },
      { href: "/admin/portal-comercial", label: "Portal comercial", icon: Globe2 },
      { href: "/admin/portal/cotizador", label: "Cotizador público", icon: Calculator },
      { href: "/admin/portal/cotizaciones", label: "Cotizaciones", icon: ClipboardCheck },
    ],
  },
  {
    title: "Envíos",
    module: "shipping",
    links: [
      { href: "/admin/shipping", label: "Dashboard de envíos", icon: LayoutDashboard },
      { href: "/admin/shipping/trips", label: "Viajes", icon: Route },
      { href: "/admin/shipping/shipments", label: "Todos los envíos", icon: Truck },
      { href: "/admin/shipping/staff", label: "Personal", icon: Users },
      { href: "/admin/shipping/settings", label: "Ajustes de envíos", icon: Wrench },
    ],
  },
  {
    title: "Menú",
    module: "menu",
    links: [
      { href: "/admin/menu", label: "Categorías y platillos", icon: Utensils },
      { href: "/admin/menu/menu-del-dia", label: "Menú del día", icon: CalendarDays },
      { href: "/admin/menu/operacion", label: "Operación en vivo", icon: RadioTower },
      { href: "/admin/menu/inventario", label: "Inventario", icon: Boxes },
      { href: "/admin/menu/ordenes", label: "Órdenes", icon: CalendarCheck2 },
    ],
  },
  {
    title: "Reservas",
    module: "reservas",
    links: [
      { href: "/admin/reservas", label: "Mesas y franjas", icon: Armchair },
      { href: "/admin/reservas/solicitudes", label: "Solicitudes", icon: CalendarCheck2 },
    ],
  },
  {
    title: "Marketing",
    links: [
      { href: "/admin/marketing/promotions", label: "Promociones", icon: Megaphone },
      { href: "/admin/marketing/recordatorios", label: "Recordatorios", icon: BellRing },
    ],
  },
  {
    title: "Configuración",
    links: [
      { href: "/admin/settings", label: "Ajustes de tienda", icon: Settings },
      { href: "/admin/comision", label: "Comisión de plataforma", icon: Wallet },
    ],
  },
];

export function isModuleEnabled(
  store:
    | Pick<
        AccessStore,
        | "module_store_enabled"
        | "module_shipping_enabled"
        | "module_pickups_enabled"
        | "module_menu_enabled"
        | "module_reservas_enabled"
        | "module_economy_enabled"
      >
    | null
    | undefined,
  moduleKey: AdminModuleKey | undefined,
): boolean {
  if (!moduleKey) return true;

  switch (moduleKey) {
    case "store":
      return store?.module_store_enabled !== false;
    case "shipping":
      return store?.module_shipping_enabled === true;
    case "pickups":
      return store?.module_pickups_enabled === true;
    case "menu":
      return store?.module_menu_enabled === true;
    case "reservas":
      return store?.module_reservas_enabled === true;
    case "economy":
      return store?.module_economy_enabled === true;
    default:
      return true;
  }
}

export function getVisibleAdminSections(
  store:
    | Pick<
        AccessStore,
        | "module_store_enabled"
        | "module_shipping_enabled"
        | "module_pickups_enabled"
        | "module_menu_enabled"
        | "module_reservas_enabled"
        | "module_economy_enabled"
      >
    | null
    | undefined,
  isSuperAdmin: boolean,
): AdminSection[] {
  if (isSuperAdmin) return adminNavSections;
  return adminNavSections.filter((section) => isModuleEnabled(store, section.module));
}

export { Store as StoreIcon, ExternalLink };
