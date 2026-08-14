/* =========================================================
   PRODUCTOS NORMALES
========================================================= */

export type Product = {
  id: string | number;
  name: string;
  price: number;
  image_url?: string | null;
  category?: string | null;
  description?: string | null;
  stock?: number | null;
  is_active?: boolean;
  tag?: string | null;

  is_home_featured?: boolean | null;
  home_featured_order?: number | null;
  home_featured_label?: string | null;

  minimum_order_exempt?: boolean | null;
  delivery_included?: boolean | null;

  /* =======================================================
     FASE 7 - REGLAS DE COMPRA
  ======================================================= */

  max_quantity_per_order?: number | null;

  product_price_tiers?: Array<{
    min_quantity: number;
    unit_price: number;
  }> | null;

  /* Promedio y cantidad de reseñas aprobadas — denormalizado en
     `products` vía trigger, ver sql/migration_product_reviews.sql. */
  rating_avg?: number | null;
  rating_count?: number | null;
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

  /**
   * Precio unitario efectivo para la cantidad actual.
   */
  price: number;

  /**
   * Precio normal antes de aplicar una escala por cantidad.
   */
  base_price?: number;

  image_url: string;
  quantity: number;

  /* stock actual del producto */
  stock?: number;

  max_quantity_per_order?: number | null;

  product_price_tiers?: Array<{
    min_quantity: number;
    unit_price: number;
  }>;

  minimum_order_exempt?: boolean | null;
  delivery_included?: boolean | null;

  type: "product" | "combo";
};
