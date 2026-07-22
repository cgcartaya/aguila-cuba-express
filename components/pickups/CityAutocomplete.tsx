"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";

type CityAutocompleteProps = {
  cities: string[];
  value: string;
  onChange: (city: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();
}

export default function CityAutocomplete({
  cities,
  value,
  onChange,
  disabled = false,
  loading = false,
  placeholder = "Empieza a escribir: Columbia, Charleston...",
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    if (value && normalize(value) !== normalize(query)) setQuery(value);
  }, [value]);

  const matches = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return cities.slice(0, 8);

    const starts = cities.filter((city) => normalize(city).startsWith(needle));
    const contains = cities.filter((city) => {
      const cityName = normalize(city);
      return !cityName.startsWith(needle) && cityName.includes(needle);
    });

    return [...starts, ...contains].slice(0, 8);
  }, [cities, query]);

  function selectCity(city: string) {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    setQuery(city);
    onChange(city);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clearCity() {
    setQuery("");
    onChange("");
    setOpen(true);
    setActiveIndex(-1);
  }

  function handleInput(nextValue: string) {
    setQuery(nextValue);
    if (normalize(nextValue) !== normalize(value)) onChange("");
    setOpen(true);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (event.key === "Enter" && open && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      selectCity(matches[activeIndex]);
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const selected = Boolean(value) && normalize(query) === normalize(value);

  return (
    <div className="relative">
      <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.08em] text-slate-600">
        Ciudad
      </label>
      <div
        className={`flex items-center rounded-xl border bg-white transition focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-100 ${
          selected ? "border-emerald-400" : "border-slate-300"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <Search className="ml-3.5 shrink-0 text-slate-500" size={18} />
        <input
          value={query}
          onChange={(event) => handleInput(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 160);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={loading ? "Cargando ciudades..." : placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-bold text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-400"
        />
        {query && !disabled ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearCity}
            aria-label="Limpiar ciudad"
            className="mr-2 rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={16} />
          </button>
        ) : (
          <ChevronDown className="mr-3 text-slate-500" size={18} />
        )}
      </div>

      <p className="mt-1.5 text-xs font-semibold text-slate-500">
        Escribe las primeras letras y selecciona una opción.
      </p>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute z-[70] mt-2 w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_18px_45px_rgba(15,23,42,.22)]"
        >
          <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">
            {query ? `Resultados para “${query}”` : "Ciudades disponibles"}
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5">
            {matches.length > 0 ? (
              matches.map((city, index) => {
                const isActive = index === activeIndex;
                const isSelected = city === value;
                return (
                  <button
                    key={city}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => selectCity(city)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      isActive ? "bg-blue-600 text-white" : "text-slate-900 hover:bg-blue-50"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive
                          ? "bg-white/15 text-white"
                          : isSelected
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isSelected ? <Check size={16} /> : <MapPin size={16} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-black">{city}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-5 text-center">
                <p className="font-black text-slate-800">No encontramos esa ciudad</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Prueba con menos letras.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {query && !selected && (
        <p className="mt-1.5 text-xs font-bold text-amber-700">
          Debes seleccionar una ciudad de la lista.
        </p>
      )}
    </div>
  );
}
