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
  category_sort_order,
  is_category_featured,
  is_home_featured,
  home_featured_order,
  home_featured_label,
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
  category_sort_order,
  is_category_featured,
  is_home_featured,
  home_featured_order,
  home_featured_label,
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
    .is("deleted_at", null)
    .order("category", { ascending: true })
    .order("is_category_featured", { ascending: false })
    .order("category_sort_order", { ascending: true, nullsFirst: false })
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
    .order("category", { ascending: true })
    .order("is_category_featured", { ascending: false })
    .order("category_sort_order", { ascending: true, nullsFirst: false })
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
    .is("deleted_at", null)
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
    .is("deleted_at", null)
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
    .is("deleted_at", null)
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
    .is("deleted_at", null)
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
    .is("deleted_at", null)
    .order("category", { ascending: true })
    .order("is_category_featured", { ascending: false })
    .order("category_sort_order", { ascending: true, nullsFirst: false })
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
    .is("deleted_at", null)
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
    .is("deleted_at", null)
    .eq("category", category)
    .neq("id", currentProductId)
    .order("is_category_featured", { ascending: false })
    .order("category_sort_order", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (storeId) {
    query = query.eq("store_id", storeId);
  }

  return query;
}




/* =========================================================
   ADMIN / HOME - PRODUCTOS DESTACADOS
========================================================= */

export async function updateHomeFeaturedProduct(
  productId: string,
  storeId: string,
  values: {
    is_home_featured: boolean;
    home_featured_order: number | null;
    home_featured_label: string | null;
  }
) {
  return supabase
    .from("products")
    .update(values)
    .eq("id", productId)
    .eq("store_id", storeId)
    .is("deleted_at", null)
    .select("id, is_home_featured, home_featured_order, home_featured_label")
    .single();
}

export async function getHomeFeaturedProductsByStoreId(storeId: string) {
  return supabase
    .from("products")
    .select(PRODUCT_PUBLIC_SELECT)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .eq("is_home_featured", true)
    .is("deleted_at", null)
    .order("home_featured_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
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
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "webp";
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${productId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, file, {
      cacheControl: "31536000",
      contentType: file.type || undefined,
      upsert: false,
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

/* =========================================================
   ADMIN - PAPELERA DE PRODUCTOS
   Funciones multiempresa para mover, restaurar y eliminar.
========================================================= */

export async function getTrashProductsByStoreId(storeId: string) {
  return supabase
    .from("products")
    .select(`
      id,
      store_id,
      name,
      category,
      price,
      stock,
      sku,
      is_active,
      deleted_at,
      product_images (
        image_url,
        is_main,
        position
      )
    `)
    .eq("store_id", storeId)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
}

export async function getTrashProductsCountByStoreId(storeId: string) {
  return supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .not("deleted_at", "is", null);
}

export async function moveProductToTrashByStoreId(
  productId: string,
  storeId: string
) {
  return supabase
    .from("products")
    .update({
      deleted_at: new Date().toISOString(),
      is_active: false,
    })
    .eq("id", productId)
    .eq("store_id", storeId)
    .is("deleted_at", null);
}

export async function restoreProductByStoreId(
  productId: string,
  storeId: string
) {
  return supabase
    .from("products")
    .update({
      deleted_at: null,
      is_active: true,
    })
    .eq("id", productId)
    .eq("store_id", storeId)
    .not("deleted_at", "is", null);
}

export async function deleteProductForeverByStoreId(
  productId: string,
  storeId: string
) {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, store_id")
    .eq("id", productId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (productError) {
    return { data: null, error: productError };
  }

  if (!product) {
    return {
      data: null,
      error: {
        message: "Producto no encontrado en la tienda activa.",
      },
    };
  }

  /*
    Regla profesional:
    - Si el producto aparece en órdenes, NO se borra físicamente.
    - Se conserva en papelera para no romper historial de ventas/reportes.
  */
  const { count: orderItemsCount, error: orderItemsCountError } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  if (orderItemsCountError) {
    return { data: null, error: orderItemsCountError };
  }

  if ((orderItemsCount || 0) > 0) {
    return {
      data: null,
      error: {
        message:
          "Este producto no se puede eliminar definitivamente porque pertenece a órdenes existentes. Se mantendrá archivado en la papelera para conservar el historial.",
      },
    };
  }

  const { data: images, error: imagesReadError } = await supabase
    .from("product_images")
    .select("id, storage_path")
    .eq("product_id", productId);

  if (imagesReadError) {
    return { data: null, error: imagesReadError };
  }

  const storagePaths =
    images
      ?.map((image) => image.storage_path)
      .filter((path): path is string => Boolean(path)) || [];

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("product-images")
      .remove(storagePaths);

    if (storageError) {
      return { data: null, error: storageError };
    }
  }

  const { error: inventoryDeleteError } = await supabase
    .from("inventory_movements")
    .delete()
    .eq("product_id", productId);

  if (inventoryDeleteError) {
    return { data: null, error: inventoryDeleteError };
  }

  const { error: comboItemsDeleteError } = await supabase
    .from("combo_items")
    .delete()
    .eq("product_id", productId);

  if (comboItemsDeleteError) {
    return { data: null, error: comboItemsDeleteError };
  }

  const { error: imagesDeleteError } = await supabase
    .from("product_images")
    .delete()
    .eq("product_id", productId);

  if (imagesDeleteError) {
    return { data: null, error: imagesDeleteError };
  }

  return supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("store_id", storeId);
}


/* =========================================================
   ADMIN - ORDEN MANUAL POR CATEGORÍA
========================================================= */

export type CategoryProductOrderItem = {
  id: string;
  category_sort_order: number;
  is_category_featured: boolean;
};

export async function updateCategoryProductsOrder(
  storeId: string,
  category: string,
  items: CategoryProductOrderItem[]
) {
  try {
    const results = await Promise.all(
      items.map((item) =>
        supabase
          .from("products")
          .update({
            category_sort_order: item.category_sort_order,
            is_category_featured: item.is_category_featured,
          })
          .eq("id", item.id)
          .eq("store_id", storeId)
          .eq("category", category)
          .is("deleted_at", null)
      )
    );

    const failed = results.find((result) => result.error);
    return failed || { data: items, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("No se pudo guardar el orden"),
    };
  }
}
