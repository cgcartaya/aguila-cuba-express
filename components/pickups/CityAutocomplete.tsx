"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, MapPin, Search, X } from "lucide-react";

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
  placeholder = "Ej. Columbia",
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    if (normalize(value) !== normalize(query)) setQuery(value);
    // query is intentionally omitted to avoid overriding what the user is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const matches = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return [];

    const starts = cities.filter((city) => normalize(city).startsWith(needle));
    const contains = cities.filter((city) => {
      const cityName = normalize(city);
      return !cityName.startsWith(needle) && cityName.includes(needle);
    });

    return [...starts, ...contains].slice(0, 8);
  }, [cities, query]);

  const selected = Boolean(value) && normalize(query) === normalize(value);

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
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleInput(nextValue: string) {
    setQuery(nextValue);
    if (normalize(nextValue) !== normalize(value)) onChange("");
    setOpen(Boolean(nextValue.trim()));
    setActiveIndex(-1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, matches.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter" && open && activeIndex >= 0 && matches[activeIndex]) {
      event.preventDefault();
      selectCity(matches[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-black text-slate-800">Ciudad</label>
      <div
        className={`flex min-h-14 items-center rounded-2xl border bg-white transition focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100 ${
          selected ? "border-emerald-400" : "border-slate-300"
        } ${disabled ? "opacity-60" : ""}`}
      >
        <Search className="ml-4 shrink-0 text-slate-400" size={20} />
        <input
          value={query}
          onChange={(event) => handleInput(event.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 180);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={loading ? "Cargando ciudades..." : placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent px-3 py-3.5 text-base font-bold text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-400"
        />
        {query && !disabled && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clearCity}
            aria-label="Limpiar ciudad"
            className="mr-3 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <p className="mt-2 text-sm font-medium text-slate-500">
        Escribe las primeras letras y selecciona una ciudad de la lista.
      </p>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute z-[120] mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,.22)]"
        >
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
            Coincidencias
          </div>
          <div className="max-h-72 overflow-y-auto p-2">
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
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition ${
                      isActive ? "bg-[#082b5c] text-white" : "text-slate-950 hover:bg-blue-50"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        isActive
                          ? "bg-white/15 text-white"
                          : isSelected
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {isSelected ? <Check size={17} /> : <MapPin size={17} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-base font-black">{city}</span>
                  </button>
                );
              })
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="font-black text-slate-900">No encontramos esa ciudad</p>
                <p className="mt-1 text-sm font-medium text-slate-500">Prueba con menos letras.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {query && !selected && !open && (
        <p className="mt-2 text-sm font-bold text-amber-700">Selecciona una ciudad de las sugerencias.</p>
      )}
    </div>
  );
}
