export type Category = {
  id: string;
  name: string;
  slug: string;
  color: string;
  icon?: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

export type StoreSettings = {
  id: string;

  store_name: string;
  slogan?: string | null;

  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;

  address?: string | null;
  city?: string | null;

  facebook?: string | null;
  instagram?: string | null;

  minimum_order: number;
  delivery_fee: number;
  free_delivery_from: number;

  delivery_message?: string | null;

  logo_url?: string | null;
  favicon_url?: string | null;

  updated_at?: string;
};

export type Banner = {
  id: string;

  title: string;
  subtitle?: string | null;

  image_url?: string | null;

  button_text?: string | null;
  button_link?: string | null;

  sort_order: number;
  is_active: boolean;

  created_at?: string;
};