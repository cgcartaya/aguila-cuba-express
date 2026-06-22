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

  /*
    product -> producto normal
    combo   -> combo
  */
  type: "product" | "combo";
};