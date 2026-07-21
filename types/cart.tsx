/* =========================================================
   PRODUCTOS NORMALES
========================================================= */

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
  is_home_featured?: boolean | null;
  home_featured_order?: number | null;
  home_featured_label?: string | null;
};

/* =========================================================
   COMBOS
========================================================= */

export type Combo = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
};

/* =========================================================
   ITEM DEL CARRITO
========================================================= */

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image_url: string;
  quantity: number;

  /* stock actual del producto */
  stock?: number;

  type: "product" | "combo";
};