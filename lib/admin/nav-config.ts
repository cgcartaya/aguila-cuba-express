import type { ComponentType } from "react";
import {
  BarChart3,
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
  Users,
  Wrench,
} from "lucide-react";

import type { AccessStore } from "@/lib/admin/access";

/*
 * Fuente única de verdad del menú de administración de tienda.
 * La usan tanto StoreAdminNav (desktop) como StoreAdminMobileMenu
 * (mobile), así nunca vuelven a desincronizarse entre sí.
 *
 * Cada sección puede declarar un `module`: si lo hace, la sección
 * solo se muestra cuando la tienda tiene ese módulo contratado
 * (según el flag correspondiente en `stores`). Si no declara
 * `module`, es una sección "core" y se muestra siempre.
 *
 * Para agregar un módulo nuevo en el futuro:
 *   1. Agrega la columna module_x_enabled en `stores`.
 *   2. Agrégala a AccessStore en lib/admin/access.ts y al SELECT
 *      de access-service.ts.
 *   3. Agrega la key en AdminModuleKey y en isModuleEnabled() abajo.
 *   4. Márcala en la sección correspondiente con `module: "x"`.
 */

export type AdminModuleKey = "shipping";

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
    title: "Operación",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Órdenes", icon: ShoppingCart },
      { href: "/admin/customers", label: "Clientes", icon: Users },
      { href: "/admin/analytics", label: "Visitas", icon: BarChart3 },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { href: "/admin/products", label: "Productos", icon: Package },
      { href: "/admin/combos", label: "Combos", icon: Layers3 },
      { href: "/admin/inventory", label: "Inventario", icon: Boxes },
    ],
  },
  {
    title: "Recogidas",
    links: [
      { href: "/admin/pickups", label: "Solicitudes de recogida", icon: CalendarDays },
      { href: "/admin/pickups/routes", label: "Rutas de recogida", icon: Route },
      { href: "/admin/pickups/customers", label: "Clientes de recogida", icon: Users },
      { href: "/admin/pickups/zones", label: "Zonas y ciudades", icon: Layers3 },
      { href: "/admin/pickups/settings", label: "Configurar cobertura", icon: MapPin },
    ],
  },
  {
    title: "Envíos",
    module: "shipping",
    links: [
      { href: "/admin/shipping", label: "Dashboard de envíos", icon: LayoutDashboard },
      { href: "/admin/shipping/trips", label: "Viajes", icon: Route },
      { href: "/admin/shipping/shipments", label: "Todos los envíos", icon: Truck },
      { href: "/admin/shipping/settings", label: "Ajustes de envíos", icon: Wrench },
    ],
  },
  {
    title: "Portal comercial",
    // TODO: este módulo en realidad se activa vía la tabla
    // customer_portal_settings.is_enabled (por tienda), no por un
    // flag en `stores`. No lo até a "shipping" para no adivinar mal
    // — confirmar con Carlos antes de gatearlo.
    links: [
      { href: "/admin/portal-comercial", label: "Configuración general", icon: Globe2 },
      { href: "/admin/portal/cotizador", label: "Cotizador público", icon: Calculator },
      { href: "/admin/portal/cotizaciones", label: "Cotizaciones", icon: ClipboardCheck },
    ],
  },
  {
    title: "Marketing",
    links: [
      { href: "/admin/marketing/promotions", label: "Promociones", icon: Megaphone },
    ],
  },
  {
    title: "Configuración",
    links: [
      { href: "/admin/settings", label: "Ajustes de tienda", icon: Settings },
    ],
  },
];

/** Un módulo sin section.module se considera "core" y siempre visible. */
export function isModuleEnabled(
  store: Pick<AccessStore, "module_shipping_enabled"> | null | undefined,
  moduleKey: AdminModuleKey | undefined,
): boolean {
  if (!moduleKey) return true;

  switch (moduleKey) {
    case "shipping":
      return store?.module_shipping_enabled === true;
    default:
      return true;
  }
}

/**
 * El Super Admin siempre ve todas las secciones (necesita poder
 * entrar a configurar/inspeccionar cualquier módulo de cualquier
 * tienda). Un usuario de tienda normal solo ve las secciones cuyo
 * módulo esté contratado — igual que ya hace ShippingAccessGuard
 * a nivel de página, esto solo evita que llegue a un callejón sin
 * salida desde el menú.
 */
export function getVisibleAdminSections(
  store: Pick<AccessStore, "module_shipping_enabled"> | null | undefined,
  isSuperAdmin: boolean,
): AdminSection[] {
  if (isSuperAdmin) return adminNavSections;
  return adminNavSections.filter((section) => isModuleEnabled(store, section.module));
}

export { Store as StoreIcon, ExternalLink };
