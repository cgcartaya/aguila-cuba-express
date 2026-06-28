import { supabase } from "@/lib/supabase";
import InventoryManager from "@/components/admin/inventory/InventoryManager";

export default async function InventoryPage() {
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      stock,
      sku,
      category,
      price,
      is_active,
      product_images (
        image_url,
        is_main,
        position
      )
    `)
    .is("deleted_at", null)
    .order("name");

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="mx-auto max-w-7xl">

        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#061b3a]">
            Inventario
          </h1>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            Controla existencias y movimientos.
          </p>
        </div>

        <InventoryManager
          initialProducts={products || []}
        />
      </div>
    </main>
  );
}