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
  sort_order: number;
  menu_item_option_groups: MenuOptionGroup[];
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
  sort_order: number;
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
