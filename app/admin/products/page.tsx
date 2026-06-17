import { supabase } from "@/lib/supabase";
import { Package, Plus, Pencil, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import ProductStatusButton from "@/components/admin/ProductStatusButton";

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

        {products?.length === 0 && (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
            <Package className="mx-auto mb-3 text-gray-400" size={44} />
            <p className="text-gray-500">Todavía no hay productos.</p>
          </div>
        )}

        <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="hidden grid-cols-7 gap-4 border-b bg-gray-50 px-6 py-4 text-sm font-bold text-gray-500 md:grid">
            <span className="col-span-2">Producto</span>
            <span>Categoría</span>
            <span>Precio</span>
            <span>Stock</span>
            <span>Estado</span>
            <span className="text-right">Acciones</span>
          </div>

          <div className="divide-y">
            {products?.map((product) => (
              <div
                key={product.id}
                className="grid gap-4 px-6 py-5 md:grid-cols-7 md:items-center"
              >
                <div className="col-span-2 flex items-center gap-4">
                  <img
                    src={product.image_url || "/logo-tienda.png"}
                    alt={product.name}
                    className="h-16 w-16 rounded-2xl object-cover bg-gray-100"
                  />

                  <div>
                    <h2 className="font-bold text-gray-900">
                      {product.name}
                    </h2>
                    <p className="line-clamp-1 text-sm text-gray-500">
                      {product.description}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  {product.category}
                </p>

                <p className="font-bold text-gray-900">
                  ${Number(product.price).toFixed(2)}
                </p>

                <p className="text-sm text-gray-600">
                  {product.stock}
                </p>

                <div>
                  {product.is_active ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                      <Eye size={14} />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-600">
                      <EyeOff size={14} />
                      Oculto
                    </span>
                  )}
                </div>

<div className="flex justify-end gap-2">
  <Link
    href={`/admin/products/${product.id}/edit`}
    className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
  >
    <Pencil size={16} />
    Editar
  </Link>

  <ProductStatusButton
    productId={product.id}
    isActive={product.is_active}
  />
</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}