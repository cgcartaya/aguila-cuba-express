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
  stock: number | null;
  daily_stock_enabled: boolean;
  menu_item_option_groups: MenuOptionGroup[];
};

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
  track_stock: boolean;
  stock: number;
  daily_stock_enabled: boolean;
  option_groups: MenuOptionGroupFormData[];
};

export type MenuCartSelectedOption = {
  group_id: string;
  group_name: string;
  option_id: string;
  option_label: string;
  price_delta: number;
};

export type MenuCartLine = {
  lineId: string;
  menu_item_id: string;
  name: string;
  unit_base_price: number;
  quantity: number;
  selected_options: MenuCartSelectedOption[];
  notes?: string;
};

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

export type MenuDailyStock = {
  id: string;
  store_id: string;
  menu_item_id: string;
  stock_date: string;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type DailyStockRow = {
  menu_item_id: string;
  item_name: string;
  quantity: number | null;
  sold: number;
  remaining: number | null;
};

export type PermanentStockRow = {
  menu_item_id: string;
  item_name: string;
  stock: number;
};

/* =========================================================
   MENÚS Y HORARIOS
========================================================= */

export type DailyMenu = {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  weekdays: number[] | null;
  start_time: string | null;
  end_time: string | null;
};

export type EligibleDailyMenuItem = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  daily_stock_enabled: boolean;
  stock: number | null;
};

export type DailyMenuItemOverride = {
  daily_menu_id: string;
  menu_item_id: string;
  override_date: string;
  is_included: boolean;
};

export type PublicDailyMenu = {
  id: string;
  name: string;
  itemIds: string[];
  scheduleLabel?: string;
};
