export type Product = {
  id: number;
  name: string;
  price: number;
  image_url: string;
  category?: string;
  description?: string;
  stock?: number;
  is_active?: boolean;
  tag?: string | null;
};

export type CartItem = Product & {
  quantity: number;
};