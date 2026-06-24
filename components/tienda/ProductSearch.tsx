"use client";

import { Search, X } from "lucide-react";

type ProductSearchProps = {
  busqueda: string;
  setBusqueda: (value: string) => void;
};

export default function ProductSearch({
  busqueda,
  setBusqueda,
}: ProductSearchProps) {
  return (
    <section className="py-4">
      <div className="flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition focus-within:border-[#061b3a] focus-within:ring-2 focus-within:ring-slate-100">
        {/* Icono búsqueda */}
        <Search
          size={22}
          className="mr-3 shrink-0 text-slate-400"
        />

        {/* Input */}
        <input
          type="text"
          inputMode="search"
          autoComplete="off"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="
            w-full
            bg-transparent
            text-base
            text-slate-800
            outline-none
            placeholder:text-slate-400
          "
        />

        {/* Limpiar búsqueda */}
        {busqueda && (
          <button
            type="button"
            onClick={() => setBusqueda("")}
            className="
              ml-2
              rounded-full
              p-1
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
          >
            <X size={18} />
          </button>
        )}
      </div>
    </section>
  );
}