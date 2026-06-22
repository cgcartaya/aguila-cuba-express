/* =========================================================
   TYPES - COMBOS ADMIN

   Este archivo centraliza todos los tipos relacionados
   con la creación y edición de combos.

   Beneficios:
   - Evitamos duplicar tipos en muchos componentes.
   - Facilita la refactorización futura.
   - Mantiene el código limpio y escalable.
========================================================= */


/* =========================================================
   IMAGEN DE PRODUCTO

   Corresponde a la tabla:
   product_images
========================================================= */

export type ProductImage = {
  image_url: string;
  is_main: boolean;
  position: number | null;
};


/* =========================================================
   PRODUCTO DISPONIBLE PARA COMBOS

   Producto que viene de la tabla:
   products
========================================================= */

export type ComboProduct = {
  id: string;

  name: string;

  description?: string | null;

  price: number;

  stock: number;

  category?: string | null;

  product_images?: ProductImage[];
};


/* =========================================================
   PRODUCTO SELECCIONADO DENTRO DEL COMBO

   Representa un producto que el administrador
   agregó al combo con una cantidad determinada.
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

   Datos generales almacenados en la tabla:
   combos
========================================================= */

export type ComboFormData = {
  name: string;

  description: string;

  /*
    Precio final de venta del combo.

    Este puede ser:
    - Igual a la suma de productos.
    - Menor si hay descuento.
    - Mayor si el negocio lo decide.
  */
  price: number;

  image_url?: string;

  is_active: boolean;
};


/* =========================================================
   CÁLCULOS DEL COMBO

   Información generada en tiempo real
   para mostrar al administrador.
========================================================= */

export type ComboPricing = {
  /*
    Suma de los productos individuales.
  */
  regularPrice: number;

  /*
    Precio configurado para el combo.
  */
  comboPrice: number;

  /*
    Diferencia entre ambos valores.

    Si es positiva:
    El cliente está ahorrando.

    Si es negativa:
    El combo cuesta más que comprar
    los productos por separado.
  */
  difference: number;
};