import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Package, Plus } from "lucide-react";
import ProductsAdminClient from "@/components/admin/ProductsAdminClient";

export default async function AdminProductsPage() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <p className="text-red-600">Error cargando productos.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
            <p className="mt-2 text-gray-500">
              Administra el catálogo de la tienda.
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 font-bold text-white"
          >
            <Plus size={20} />
            Agregar producto
          </Link>
        </div>

        {products?.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <Package className="mx-auto mb-3 text-gray-400" size={44} />
            <p className="text-gray-500">Todavía no hay productos.</p>
          </div>
        ) : (
          <ProductsAdminClient products={products || []} />
        )}
      </div>
    </main>
  );
}