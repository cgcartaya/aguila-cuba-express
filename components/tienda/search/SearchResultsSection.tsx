"use client";

import { Search, XCircle } from "lucide-react";

import CatalogFilters from "@/components/tienda/CatalogFilters";
import { useTiendaSearch } from "@/components/tienda/search/TiendaSearchContext";
import type { Product } from "@/types/cart";

type Props = {
  products: Product[];
  showWeightFilter: boolean;
  onAddToCart: (product: Product) => void;
};

export default function SearchResultsSection({
  products,
  showWeightFilter,
  onAddToCart,
}: Props) {
  const { search, clearSearch } = useTiendaSearch();
  const query = search.trim();

  return (
    <section id="store-search-results" className="min-w-0 px-2 py-5 sm:px-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
            <Search size={14} />
            Búsqueda activa
          </div>

          <h2 className="mt-3 break-words text-xl font-black leading-tight text-[#061b3a] [overflow-wrap:anywhere] sm:text-2xl">
            Resultados para “{query}”
          </h2>

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

      <CatalogFilters
        products={products}
        showWeightFilter={showWeightFilter}
        onAddToCart={onAddToCart}
      >
        {products.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-black text-[#061b3a]">No encontramos productos</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Prueba con otro nombre, marca o categoría.
            </p>
          </div>
        )}
      </CatalogFilters>
    </section>
  );
}
