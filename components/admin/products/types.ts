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
};