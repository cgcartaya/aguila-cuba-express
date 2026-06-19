"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/admin/products/ProductCard";
import type { Product } from "@/components/admin/products/types";

type Props = {
  title: string;
  description: string;
  filter: "low-stock" | "inactive";
};

export default function ProductsStatusPage({
  title,
  description,
  filter,
}: Props) {
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
            <p className="text-sm text-slate-500">Todo está bien por ahora.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}