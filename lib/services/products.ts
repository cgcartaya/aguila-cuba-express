import { supabase } from "@/lib/supabase";
import { getDefaultStore } from "@/lib/services/stores";

import type { Product } from "@/components/admin/products/types";

/* =========================================================
   SELECTS OPTIMIZADOS
   Evitamos SELECT * en la tienda pública para reducir payload.
========================================================= */

const PRODUCT_PUBLIC_SELECT = `
  id,
  store_id,
  name,
  description,
  price,
  category,
  stock,
  image_url,
  is_active,
  created_at,
  product_images (
    image_url,
    is_main,
    position
  )
`;

const PRODUCT_DETAIL_SELECT = `
  *,
  product_images (
    id,
    image_url,
    is_main,
    position
  )
`;

const PRODUCT_INVENTORY_SELECT = `
  id,
  store_id,
  name,
  price,
  category,
  stock,
  sku,
  is_active,
  product_images (
    image_url,
    is_main,
    position
  )
`;


/* =========================================================
   PRODUCTS SERVICE
========================================================= */

// Obtener un producto por ID
export async function getProductById(id: string) {
  return supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();
}

// Obtener productos activos
export async function getActiveProducts() {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return { data: [], error: null };
  }

  return supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
}


/* =========================================================
   ADMIN - PRODUCTOS POR TIENDA
========================================================= */

export async function getAdminProductsByStoreId(storeId: string) {
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
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
}

/* =========================================================
   ADMIN - PRODUCTOS PARA COMBOS
========================================================= */

export async function getProductsForCombosByStoreId(storeId: string) {
  return supabase
    .from("products")
    .select(PRODUCT_PUBLIC_SELECT)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("name", { ascending: true });
}

export async function getProductsForCombos() {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return { data: [], error: null };
  }

  return supabase
    .from("products")
    .select(PRODUCT_PUBLIC_SELECT)
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("name", { ascending: true });
}

// Obtener productos inactivos
export async function getInactiveProducts() {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return { data: [], error: null };
  }

  return supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .eq("is_active", false)
    .order("created_at", { ascending: false });
}

// Obtener productos con bajo stock
export async function getLowStockProducts(limit = 5) {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return { data: [], error: null };
  }

  return supabase
    .from("products")
    .select("*")
    .eq("store_id", store.id)
    .lte("stock", limit)
    .order("created_at", { ascending: false });
}

/* =========================================================
   TIENDA PÚBLICA - CONSULTAS
========================================================= */

export async function getProducts() {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return { data: [], error: null };
  }

  return getStoreProductsByStoreId(store.id);
}

// Obtener productos visibles en la tienda pública
export async function getStoreProducts() {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return { data: [], error: null };
  }

  return getStoreProductsByStoreId(store.id);
}

// Obtener productos visibles por tienda sin volver a consultar stores.
export async function getStoreProductsByStoreId(storeId: string) {
  return supabase
    .from("products")
    .select(PRODUCT_PUBLIC_SELECT)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
}

/*
  Obtener un producto específico para la página
  de detalle estilo Amazon/Shopify.
*/
export async function getStoreProductById(id: string) {
  return supabase
    .from("products")
    .select(PRODUCT_DETAIL_SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .single();
}

/*
  Obtener productos relacionados.
*/
export async function getRelatedProducts(
  category: string,
  currentProductId: string,
  limit = 4,
  storeId?: string
) {
  let query = supabase
    .from("products")
    .select(PRODUCT_PUBLIC_SELECT)
    .eq("is_active", true)
    .eq("category", category)
    .neq("id", currentProductId)
    .limit(limit);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  return query;
}


/* =========================================================
   ADMIN - INVENTARIO
========================================================= */

export async function getInventoryProductsByStoreId(storeId: string) {
  return supabase
    .from("products")
    .select(PRODUCT_INVENTORY_SELECT)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .order("name", { ascending: true });
}

export async function getInventoryProducts() {
  const storeResult = await getDefaultStore();

  if (!storeResult?.data) {
    return { data: [], error: null };
  }

  return getInventoryProductsByStoreId(storeResult.data.id);
}

/* =========================================================
   PRODUCTOS - ACCIONES
========================================================= */

// Crear producto para una tienda específica
export async function createProductForStore(
  storeId: string,
  product: Omit<Product, "id" | "created_at">
) {
  return supabase
    .from("products")
    .insert({
      ...product,
      store_id: storeId,
    })
    .select()
    .single();
}

// Crear producto
export async function createProduct(
  product: Omit<Product, "id" | "created_at">
) {
  const { data: store } = await getDefaultStore();

  if (!store) {
    return {
      data: null,
      error: {
        message: "No se encontró la tienda activa",
      },
    };
  }

  return supabase
    .from("products")
    .insert({
      ...product,
      store_id: store.id,
    })
    .select()
    .single();
}

// Actualizar producto
export async function updateProduct(
  id: string,
  product: Partial<Omit<Product, "id" | "created_at">>
) {
  return supabase
    .from("products")
    .update(product)
    .eq("id", id)
    .select()
    .single();
}

// Activar o desactivar producto
export async function toggleProductStatus(product: Product) {
  return supabase
    .from("products")
    .update({
      is_active: !product.is_active,
    })
    .eq("id", product.id);
}

// Eliminar producto definitivamente
export async function deleteProductForever(id: string) {
  return supabase
    .from("products")
    .delete()
    .eq("id", id);
}

/* =========================================================
   PRODUCT IMAGES - CONSULTAS
========================================================= */

// Obtener imágenes de un producto
export async function getProductImages(productId: string) {
  return supabase
    .from("product_images")
    .select("id, product_id, image_url, storage_path, is_main, position")
    .eq("product_id", productId)
    .order("position", { ascending: true });
}

/* =========================================================
   PRODUCT IMAGES - ACCIONES
========================================================= */

// Subir imagen a Supabase Storage y registrar URL
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
    .upload(filePath, file, {
      cacheControl: "31536000",
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

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

// Eliminar imagen
export async function deleteProductImage(image: {
  id: string;
  storage_path?: string | null;
}) {
  if (image.storage_path) {
    await supabase.storage
      .from("product-images")
      .remove([image.storage_path]);
  }

  return supabase
    .from("product_images")
    .delete()
    .eq("id", image.id);
}

// Marcar imagen principal
export async function setMainProductImage(
  productId: string,
  imageId: string
) {
  await supabase
    .from("product_images")
    .update({ is_main: false })
    .eq("product_id", productId);

  return supabase
    .from("product_images")
    .update({ is_main: true })
    .eq("id", imageId);
}
