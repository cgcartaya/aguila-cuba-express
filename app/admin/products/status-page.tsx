"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  sku?: string | null;
  name: string;
  category: string;
  price: number;
  stock: number;
  image_url?: string | null;
  is_active: boolean;
};

type Props = {
  title: string;
  description: string;
  filter: "low-stock" | "inactive";
};

export default function ProductsStatusPage({ title, description, filter }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);

    let query = supabase.from("products").select("*");

    if (filter === "low-stock") {
      query = query.lte("stock", 5);
    }

    if (filter === "inactive") {
      query = query.eq("is_active", false);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error(error.message);
      setProducts([]);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      <section className="mx-auto max-w-5xl px-4 py-5">
        <Link
          href="/admin/products"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
        >
          <ArrowLeft size={18} />
          Volver a productos
        </Link>

        <div className="mb-5">
          <p className="text-sm text-slate-500">Administración</p>
          <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>

        <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total encontrado</p>
          <p className="text-2xl font-bold text-slate-900">{products.length}</p>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow-sm">
            Cargando productos...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <Package className="mx-auto mb-3 text-slate-400" size={36} />
            <h2 className="font-semibold text-slate-800">
              No hay productos aquí
            </h2>
            <p className="text-sm text-slate-500">
              Todo está bien por ahora.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-2xl bg-white p-3 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package size={26} className="text-slate-400" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="line-clamp-1 font-semibold text-slate-900">
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          SKU: {product.sku || "Sin SKU"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          product.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {product.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                        {product.category}
                      </span>

                      <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                        ${Number(product.price).toFixed(2)}
                      </span>

                      <span
                        className={`rounded-full px-2 py-1 font-semibold ${
                          product.stock <= 5
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        Existencias: {product.stock}
                      </span>
                    </div>

                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="mt-3 flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      <Pencil size={15} />
                      Editar producto
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}