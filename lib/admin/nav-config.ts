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
} from "lucide-react";

import type { AccessStore } from "@/lib/admin/access";

/*
 * Fuente única de verdad del menú de administración de tienda.
 * La usan tanto StoreAdminNav (desktop) como StoreAdminMobileMenu
 * (mobile), así nunca vuelven a desincronizarse entre sí.
 *
 * Taxonomía de módulos confirmada con Carlos:
 *   - "store"    -> Dashboard, Órdenes, Productos, Combos, Clientes e
 *                   Inventario (todo el "Marketplace" base).
 *   - "pickups"  -> Recogidas + Portal comercial (cotizador y
 *                   cotizaciones van de la mano con recogidas).
 *   - "shipping" -> todo lo de Envíos.
 * "Marketing" y "Configuración" quedan sin módulo (core, siempre
 * visibles) hasta que se diga lo contrario.
 *
 * Para agregar un módulo nuevo en el futuro:
 *   1. Agrega la columna module_x_enabled en `stores` (migración SQL).
 *   2. Agrégala a AccessStore en lib/admin/access.ts y al SELECT
 *      de access-service.ts.
 *   3. Agrega la key en AdminModuleKey y en isModuleEnabled() abajo.
 *   4. Márcala en la sección correspondiente con `module: "x"`.
 */

export type AdminModuleKey = "store" | "pickups" | "shipping" | "menu" | "reservas";

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

/**
 * Cada módulo replica el MISMO criterio "activado/desactivado" que ya
 * usa el resto del código para ese flag específico — no asumí que
 * todos se comportan igual:
 *   - "store": ya se usa en la API de checkout como
 *     `=== false` para BLOQUEAR (o sea, por defecto está permitido).
 *     Aquí replico ese mismo criterio: solo se oculta si es false.
 *   - "shipping": ya se usa en ShippingAccessGuard como
 *     `!store?.module_shipping_enabled` para bloquear (por defecto
 *     está BLOQUEADO salvo que sea true explícito).
 *   - "pickups": es un flag nuevo, lo trato igual que shipping
 *     (opt-in, por defecto false) porque así quedó la migración SQL.
 */
export function isModuleEnabled(
  store:
    | Pick<
        AccessStore,
        | "module_store_enabled"
        | "module_shipping_enabled"
        | "module_pickups_enabled"
        | "module_menu_enabled"
        | "module_reservas_enabled"
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
    // "menu" es un flag nuevo, lo trato igual que shipping/pickups
    // (opt-in, por defecto false) — mismo criterio que quedó
    // documentado arriba para módulos nuevos.
    case "menu":
      return store?.module_menu_enabled === true;
    // "reservas" es un flag nuevo, mismo criterio opt-in.
    case "reservas":
      return store?.module_reservas_enabled === true;
    default:
      return true;
  }
}

/**
 * El Super Admin siempre ve todas las secciones (necesita poder
 * entrar a configurar/inspeccionar cualquier módulo de cualquier
 * tienda). Un usuario de tienda normal solo ve las secciones cuyo
 * módulo esté contratado.
 */
export function getVisibleAdminSections(
  store:
    | Pick<
        AccessStore,
        | "module_store_enabled"
        | "module_shipping_enabled"
        | "module_pickups_enabled"
        | "module_menu_enabled"
        | "module_reservas_enabled"
      >
    | null
    | undefined,
  isSuperAdmin: boolean,
): AdminSection[] {
  if (isSuperAdmin) return adminNavSections;
  return adminNavSections.filter((section) => isModuleEnabled(store, section.module));
}

export { Store as StoreIcon, ExternalLink };
