/* =========================================================
   TYPES - COMBOS ADMIN

   Tipos compartidos para crear, editar y listar combos.

   Ajuste importante:
   Supabase puede devolver relaciones anidadas como objeto o como array,
   según cómo infiera la relación. Por eso los componentes normalizan
   la relación antes de usarla.
========================================================= */

/* =========================================================
   IMAGEN DE PRODUCTO
========================================================= */

export type ProductImage = {
  image_url: string;
  is_main?: boolean | null;
  position?: number | null;
};

/* =========================================================
   PRODUCTO DISPONIBLE PARA COMBOS
========================================================= */

export type ComboProduct = {
  id: string;
  store_id?: string | null;
  name: string;
  description?: string | null;
  price: number;
  stock?: number | null;
  category?: string | null;
  image_url?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
  product_images?: ProductImage[] | null;
};

/* =========================================================
   PRODUCTO SELECCIONADO DENTRO DEL COMBO
========================================================= */

export type SelectedComboProduct = {
  product: ComboProduct;
  quantity: number;

  /*
    ID del registro en combo_items.
    Solo existe cuando estamos editando un combo ya creado.
  */
  combo_item_id?: string;
};

/* =========================================================
   FORMULARIO PRINCIPAL DEL COMBO
========================================================= */

export type ComboFormData = {
  name: string;
  description: string;
  price: number;
  image_url?: string;
  is_active: boolean;
};

/* =========================================================
   CÁLCULOS DEL COMBO
========================================================= */

export type ComboPricing = {
  regularPrice: number;
  comboPrice: number;
  difference: number;
};
