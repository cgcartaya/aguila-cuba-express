"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Search, Eye, EyeOff } from "lucide-react";
import ProductStatusButton from "@/components/admin/ProductStatusButton";

type Product = {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  image_url: string;
  stock: number;
  is_active: boolean;
};

export default function ProductsAdminClient({
  products,
}: {
  products: Product[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      status === "all" ||
      (status === "active" && product.is_active) ||
      (status === "hidden" && !product.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="mb-6 grid gap-4 rounded-3xl bg-white p-4 shadow-sm md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o categoría..."
            className="w-full rounded-2xl border px-11 py-3 outline-none focus:border-black"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-2xl border px-4 py-3 outline-none focus:border-black"
        >
          <option value="all">Todos los productos</option>
          <option value="active">Solo activos</option>
          <option value="hidden">Solo ocultos</option>
        </select>
      </div>

      <p className="mb-4 text-sm font-medium text-gray-500">
        Mostrando {filteredProducts.length} producto(s)
      </p>

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
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="grid gap-4 px-6 py-5 md:grid-cols-7 md:items-center"
            >
              <div className="col-span-2 flex items-center gap-4">
                <img
                  src={product.image_url || "/logo-tienda.png"}
                  alt={product.name}
                  className="h-16 w-16 rounded-2xl bg-gray-100 object-cover"
                />

                <div>
                  <h2 className="font-bold text-gray-900">{product.name}</h2>
                  <p className="line-clamp-1 text-sm text-gray-500">
                    {product.description}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-600">{product.category}</p>

              <p className="font-bold text-gray-900">
                ${Number(product.price).toFixed(2)}
              </p>

              <p className="text-sm text-gray-600">{product.stock}</p>

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
    </>
  );
}