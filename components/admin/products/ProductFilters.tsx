"use client";

import { ArrowUpDown, Filter, Search } from "lucide-react";

type Props = {
  search: string;
  setSearch: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  stockFilter: "all" | "low";
  setStockFilter: (value: "all" | "low") => void;
  categories: string[];
  showFilters: boolean;
  setShowFilters: (value: boolean) => void;
  activeFilters: number;
};

export default function ProductFilters({
  search,
  setSearch,
  category,
  setCategory,
  status,
  setStatus,
  sortBy,
  setSortBy,
  setStockFilter,
  categories,
  showFilters,
  setShowFilters,
  activeFilters,
}: Props) {
  return (
    <div className="mb-4 rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Search size={18} className="text-slate-400" />

        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setStockFilter("all");
          }}
          placeholder="Buscar producto..."
          className="w-full bg-transparent text-sm outline-none"
        />

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <Filter size={15} />
          Filtros {activeFilters > 0 ? `(${activeFilters})` : ""}
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
            <Filter size={16} className="text-slate-400" />

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setStockFilter("all");
              }}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="all">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setStockFilter("all");
            }}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
            <ArrowUpDown size={16} className="text-slate-400" />

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            >
              <option value="newest">Más recientes</option>
              <option value="name">Nombre A-Z</option>
              <option value="price-high">Precio mayor</option>
              <option value="price-low">Precio menor</option>
              <option value="stock-high">Stock mayor</option>
              <option value="stock-low">Stock menor</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}