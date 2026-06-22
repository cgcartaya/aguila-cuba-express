import { supabase } from "@/lib/supabase";
import type { Product } from "@/components/admin/products/types";

/* =========================================================
   PRODUCTS SERVICE
   ---------------------------------------------------------
   Este archivo centraliza todas las operaciones relacionadas
   con productos y sus imágenes.
========================================================= */

/* =========================================================
   PRODUCTOS - CONSULTAS
========================================================= */

// Obtener un producto por ID
export async function getProductById(id: string) {
  return supabase.from("products").select("*").eq("id", id).single();
}

// Obtener productos activos
export async function getActiveProducts() {
  return supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
}

/* =========================================================
   ADMIN - PRODUCTOS PARA COMBOS

   Obtiene productos activos con sus imágenes para
   construir combos desde el panel de administración.
========================================================= */

export async function getProductsForCombos() {
  return supabase
    .from("products")
    .select(`
      *,
      product_images (
        image_url,
        is_main,
        position
      )
    `)
    .eq("is_active", true)
    .order("name", { ascending: true });
}

// Obtener productos inactivos
export async function getInactiveProducts() {
  return supabase
    .from("products")
    .select("*")
    .eq("is_active", false)
    .order("created_at", { ascending: false });
}

// Obtener productos con bajo stock
export async function getLowStockProducts(limit = 5) {
  return supabase
    .from("products")
    .select("*")
    .lte("stock", limit)
    .order("created_at", { ascending: false });
}

/* =========================================================
   TIENDA PÚBLICA - CONSULTAS
========================================================= */

/*
  Obtener productos visibles en la tienda.

  Nuevo sistema:
  - Carga las imágenes desde product_images.
  - Busca la imagen marcada como principal.

  Compatibilidad:
  - Si un producto aún usa products.image_url,
    el frontend puede seguir utilizándola como fallback.
*/
export async function getProducts() {
  return supabase
    .from("products")
    .select(`
      *,
      product_images (
        image_url,
        is_main,
        position
      )
    `)
    .order("created_at", { ascending: false });
}

// Obtener productos visibles en la tienda pública
export async function getStoreProducts() {
  return supabase
    .from("products")
    .select(`
      *,
      product_images (
        image_url,
        is_main,
        position
      )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
}

/*
  Obtener un producto específico para la página
  de detalle estilo Amazon/Shopify.

  Incluye todas las imágenes del producto.
*/
export async function getStoreProductById(id: string) {
  return supabase
    .from("products")
    .select(`
      *,
      product_images (
        id,
        image_url,
        is_main,
        position
      )
    `)
    .eq("id", id)
    .eq("is_active", true)
    .single();
}


/*
  Obtener productos relacionados.

  En esta primera versión utilizaremos productos
  de la misma categoría excluyendo el producto actual.

  Más adelante podremos mejorar con:
  - productos más vendidos
  - historial de compras
  - IA de recomendaciones
*/
export async function getRelatedProducts(
  category: string,
  currentProductId: string,
  limit = 4
) {
  return supabase
    .from("products")
    .select(`
      *,
      product_images (
        image_url,
        is_main
      )
    `)
    .eq("is_active", true)
    .eq("category", category)
    .neq("id", currentProductId)
    .limit(limit);
}

/* =========================================================
   PRODUCTOS - ACCIONES
========================================================= */

// Crear producto
export async function createProduct(product: Omit<Product, "id" | "created_at">) {
  return supabase.from("products").insert(product).select().single();
}

// Actualizar producto
export async function updateProduct(
  id: string,
  product: Partial<Omit<Product, "id" | "created_at">>
) {
  return supabase.from("products").update(product).eq("id", id).select().single();
}

// Activar o desactivar producto
export async function toggleProductStatus(product: Product) {
  return supabase
    .from("products")
    .update({ is_active: !product.is_active })
    .eq("id", product.id);
}

// Eliminar producto definitivamente
export async function deleteProductForever(id: string) {
  return supabase.from("products").delete().eq("id", id);
}

/* =========================================================
   PRODUCT IMAGES - CONSULTAS
========================================================= */

// Obtener imágenes de un producto
export async function getProductImages(productId: string) {
  return supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("position", { ascending: true });
}

/* =========================================================
   PRODUCT IMAGES - ACCIONES
========================================================= */

// Subir imagen a Supabase Storage y registrar URL en product_images
export async function uploadProductImage(
  productId: string,
  file: File,
  isMain = false,
  position = 0
) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${productId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, file);

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  /*
    IMAGEN PRINCIPAL

    Si esta imagen llega como principal:
    primero quitamos cualquier principal anterior
    para garantizar que solo exista una principal.
  */

  if (isMain) {
    await supabase
      .from("product_images")
      .update({ is_main: false })
      .eq("product_id", productId);
  }

  return supabase
    .from("product_images")
    .insert({
      product_id: productId,
      image_url: publicUrlData.publicUrl,
      storage_path: filePath,
      is_main: isMain,
      position,
    })
    .select()
    .single();
}

// Eliminar imagen del bucket y luego de la tabla product_images
export async function deleteProductImage(image: {
  id: string;
  storage_path?: string | null;
}) {
  if (image.storage_path) {
    await supabase.storage.from("product-images").remove([image.storage_path]);
  }

  return supabase.from("product_images").delete().eq("id", image.id);
}

// Marcar una imagen como principal
export async function setMainProductImage(productId: string, imageId: string) {
  // Primero quitamos cualquier imagen principal anterior
  await supabase
    .from("product_images")
    .update({ is_main: false })
    .eq("product_id", productId);

  // Luego marcamos la nueva imagen principal
  return supabase
    .from("product_images")
    .update({ is_main: true })
    .eq("id", imageId);
}