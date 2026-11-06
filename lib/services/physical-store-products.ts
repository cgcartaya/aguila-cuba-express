import { supabase } from "@/lib/supabase";

export type PhysicalStoreProduct = {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  is_active: boolean;
};

export async function listPhysicalProducts(storeId: string, availableOnly = false) {
  let query = supabase.from("physical_store_products").select("id,name,price,stock,is_active")
    .eq("store_id", storeId).order("name");
  if (availableOnly) query = query.eq("is_active", true).not("price", "is", null).gt("stock", 0);
  const { data, error } = await query.returns<PhysicalStoreProduct[]>();
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function savePhysicalProduct(
  storeId: string,
  values: Omit<PhysicalStoreProduct, "id">,
  previous?: PhysicalStoreProduct,
) {
  const table = supabase.from("physical_store_products");
  const query = previous
    ? table.update(values).eq("store_id", storeId).eq("id", previous.id)
      .eq("stock", previous.stock)
    : table.insert({ ...values, store_id: storeId });
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error(error.code === "23505" ? "Ya existe un producto con ese nombre." : error.message);
  if (!data) throw new Error("El stock cambió mientras editabas. Recarga el catálogo y revisa las existencias.");
}
