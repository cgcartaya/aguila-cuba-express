/* =========================================================
   MÓDULO DE MENÚ — TIPOS
========================================================= */

export type MenuOption = {
  id: string;
  group_id: string;
  label: string;
  price_delta: number;
  sort_order: number;
};

export type MenuOptionGroup = {
  id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  max_selections: number;
  sort_order: number;
  menu_item_options: MenuOption[];
};

export type MenuItem = {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  stock: number | null; // null = inventario permanente no controlado
  daily_stock_enabled: boolean; // true = usa cupo diario (menu_daily_stock)
  menu_item_option_groups: MenuOptionGroup[];
};

/* Ítem destacado (is_featured) tal como se usa en las landings —
   trae el venue_type de su categoría (bar/restaurant/general) para
   poder separarlo en "Platos principales" vs "Bebidas principales". */
export type FeaturedMenuItem = MenuItem & {
  venue_type: "bar" | "restaurant" | "general";
};

export type MenuCategory = {
  id: string;
  store_id: string;
  name: string;
  venue_type: "bar" | "restaurant" | "general";
  sort_order: number;
  is_active: boolean;
  menu_items: MenuItem[];
};

/* =========================================================
   FORM DATA (admin) — lo que entra desde el formulario, sin
   ids todavía resueltos (se generan al guardar).
========================================================= */

export type MenuOptionFormData = {
  id?: string;
  label: string;
  price_delta: number;
  sort_order: number;
};

export type MenuOptionGroupFormData = {
  id?: string;
  name: string;
  is_required: boolean;
  max_selections: number;
  sort_order: number;
  options: MenuOptionFormData[];
};

export type MenuItemFormData = {
  id?: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  track_stock: boolean; // false = stock null (inventario permanente no controlado)
  stock: number;
  daily_stock_enabled: boolean; // cupo diario — la cantidad de HOY se pone desde /admin/menu/inventario, no aquí
  option_groups: MenuOptionGroupFormData[];
};

/* =========================================================
   CARRITO PÚBLICO (cliente eligiendo su pedido)
========================================================= */

export type MenuCartSelectedOption = {
  group_id: string;
  group_name: string;
  option_id: string;
  option_label: string;
  price_delta: number;
};

export type MenuCartLine = {
  lineId: string; // uuid generado en el cliente, distingue líneas iguales con distintas opciones
  menu_item_id: string;
  name: string;
  unit_base_price: number;
  quantity: number;
  selected_options: MenuCartSelectedOption[];
  notes?: string;
};

/* =========================================================
   ÓRDENES REALES (persistidas)
========================================================= */

export type MenuOrderType = "dine_in" | "takeaway" | "delivery";
export type MenuOrderStatus = "received" | "preparing" | "ready" | "delivered" | "cancelled";

export type MenuOrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  selected_options: MenuCartSelectedOption[];
  notes: string | null;
  line_total: number;
};

export type MenuOrder = {
  id: string;
  store_id: string;
  order_type: MenuOrderType;
  table_number: string | null;
  delivery_address: string | null;
  delivery_fee: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
  status: MenuOrderStatus;
  created_at: string;
  updated_at: string;
  menu_order_items?: MenuOrderItem[];
};

export const MENU_ORDER_STATUS_LABEL: Record<MenuOrderStatus, string> = {
  received: "Recibido",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export const MENU_ORDER_TYPE_LABEL: Record<MenuOrderType, string> = {
  dine_in: "En el restaurante",
  takeaway: "Para llevar",
  delivery: "Domicilio",
};

/* =========================================================
   INVENTARIO — cupo diario + inventario permanente
========================================================= */

export type MenuDailyStock = {
  id: string;
  store_id: string;
  menu_item_id: string;
  stock_date: string; // "YYYY-MM-DD"
  quantity: number;
  created_at: string;
  updated_at: string;
};

/** Fila del dashboard de "Platos del día": el platillo + su cupo de
 *  hoy (si ya se puso) + cuánto se ha vendido hoy. */
export type DailyStockRow = {
  menu_item_id: string;
  item_name: string;
  quantity: number | null; // null = todavía no se puso cupo hoy
  sold: number;
  remaining: number | null;
};

/** Fila del dashboard de "Inventario" (bebidas y contables). */
export type PermanentStockRow = {
  menu_item_id: string;
  item_name: string;
  stock: number;
};

/* =========================================================
   MENÚS DEL DÍA (Almuerzo, Cena...)
========================================================= */

export type DailyMenu = {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

/** Platillo elegible para un menú del día (tiene inventario activo,
 *  de cualquiera de los dos tipos) + si ya está asignado al menú
 *  que se está editando ahora mismo. */
export type EligibleDailyMenuItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  daily_stock_enabled: boolean;
  stock: number | null; // inventario permanente, si aplica
};

/** Lo que ve el portal público: cada menú del día con los ids de
 *  los platillos que tiene asignados, para armar las pestañas
 *  Almuerzo/Cena sin pedir nada aparte del cargue inicial. */
export type PublicDailyMenu = {
  id: string;
  name: string;
  itemIds: string[];
};
