export type Product = {
  id: string;
  sku?: string | null;
  name: string;
  category: string;
  description?: string | null;
  price: number;
  stock: number;
  image_url?: string | null;
  tag?: string | null;
  is_active: boolean;
  created_at?: string;
  category_sort_order?: number | null;
  is_category_featured?: boolean | null;
  is_home_featured?: boolean | null;
  home_featured_order?: number | null;
  home_featured_label?: string | null;
  product_images?: ProductImage[] | null;
};

export type ProductImage = {
  id: string;
  product_id: string;
  image_url: string;
  storage_path?: string | null;
  is_main: boolean;
  position: number;
  created_at?: string;
  category_sort_order?: number | null;
  is_category_featured?: boolean | null;
};