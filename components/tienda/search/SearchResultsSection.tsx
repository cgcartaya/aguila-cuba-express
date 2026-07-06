"use client";

import { Search, XCircle } from "lucide-react";

import ProductCard from "@/components/tienda/ProductCard";
import { useTiendaSearch } from "@/components/tienda/search/TiendaSearchContext";
import type { Product } from "@/types/cart";

type Props = {
  products: Product[];
  onAddToCart: (product: Product) => void;
};

export default function SearchResultsSection({
  products,
  onAddToCart,
}: Props) {
  const { search, clearSearch } = useTiendaSearch();
  const query = search.trim();

  return (
    <section className="px-4 py-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            <Search size={14} />
            Búsqueda activa
          </div>

          <h2 className="mt-3 text-2xl font-black leading-tight text-[#061b3a]">
            Resultados para “{query}”
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {products.length === 1
              ? "1 producto encontrado"
              : `${products.length} productos encontrados`}
          </p>
        </div>

        <button
          type="button"
          onClick={clearSearch}
          className="flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <XCircle size={16} />
          Limpiar
        </button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Search size={26} />
          </div>

          <h3 className="mt-4 text-xl font-black text-[#061b3a]">
            No encontramos productos
          </h3>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            Prueba con otro nombre, marca o categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}
    </section>
  );
}
