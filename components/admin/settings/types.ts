export type Category = {
  id: string;
  store_id?: string | null;
  name: string;
  slug: string;
  color: string;
  icon?: string | null;
  sort_order: number;
  is_active: boolean;
  minimum_order_exempt?: boolean;
  delivery_included?: boolean;
  created_at?: string;
};

export type StoreSettings = {
  id: string;
  store_id?: string | null;
  store_name: string;
  slogan?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  zelle_info?: string | null;
  email?: string | null;
  order_notification_email?: string | null;
  address?: string | null;
  city?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  minimum_order: number;
  delivery_fee: number;
  menu_delivery_fee?: number;
  free_delivery_from: number;
  delivery_message?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  hide_products_without_images?: boolean;

  // MENÚ - SELECTOR Y TASAS DE REFERENCIA
  menu_show_usd_equivalent?: boolean;
  menu_cup_per_usd?: number | null;
  menu_exchange_rate_source?: "manual" | "eltoque";
  menu_exchange_rate_updated_at?: string | null;
  menu_cup_per_eur?: number | null;
  menu_eur_exchange_rate_source?: "manual" | "eltoque";
  menu_eur_exchange_rate_updated_at?: string | null;

  // LANDING BUILDER V16.5
  show_hero?: boolean;
  show_promotions?: boolean;
  show_featured_products?: boolean;
  show_categories?: boolean;
  show_combos?: boolean;
  show_products?: boolean;
  show_delivery_banner?: boolean;
  show_help_card?: boolean;
  show_footer?: boolean;

  updated_at?: string;
};

export type BannerLayoutType = "image" | "template";

export type Banner = {
  id: string;
  store_id?: string | null;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  button_text?: string | null;
  button_link?: string | null;
  sort_order: number;
  is_active: boolean;
  layout_type?: BannerLayoutType | null;
  background_color?: string | null;
  text_color?: string | null;
  accent_color?: string | null;
  badge_text?: string | null;
  product_image_url?: string | null;
  category_id?: string | null;
  created_at?: string;
};
