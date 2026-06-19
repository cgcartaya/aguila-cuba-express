"use client";

import Link from "next/link";
import type { Product } from "./types";

type Props = {
  products: Product[];
  onQuickFilter: (type: "all" | "active") => void;
};

export default function ProductStats({ products, onQuickFilter }: Props) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <button
        onClick={() => onQuickFilter("all")}
        className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:scale-[1.01]"
      >
        <p className="text-xs text-slate-500">Total</p>
        <p className="text-xl font-bold text-slate-900">{products.length}</p>
      </button>

      <button
        onClick={() => onQuickFilter("active")}
        className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:scale-[1.01]"
      >
        <p className="text-xs text-slate-500">Activos</p>
        <p className="text-xl font-bold text-green-600">
          {products.filter((p) => p.is_active).length}
        </p>
      </button>

      <Link
        href="/admin/products/inactive"
        className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:scale-[1.01]"
      >
        <p className="text-xs text-slate-500">Inactivos</p>
        <p className="text-xl font-bold text-slate-500">
          {products.filter((p) => !p.is_active).length}
        </p>
      </Link>

      <Link
        href="/admin/products/low-stock"
        className="rounded-2xl bg-white p-4 text-left shadow-sm transition hover:scale-[1.01]"
      >
        <p className="text-xs text-slate-500">Bajo stock</p>
        <p className="text-xl font-bold text-orange-500">
          {products.filter((p) => p.stock <= 5).length}
        </p>
      </Link>
    </div>
  );
}