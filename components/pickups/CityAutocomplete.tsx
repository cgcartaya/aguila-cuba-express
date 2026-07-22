"use client";

import { KeyboardEvent, useMemo, useRef, useState } from "react";
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
  placeholder = "Escribe tu ciudad",
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimer = useRef<number | null>(null);

  const matches = useMemo(() => {
    const needle = normalize(query);
    if (!needle) return cities.slice(0, 10);

    const starts = cities.filter((city) => normalize(city).startsWith(needle));
    const contains = cities.filter((city) => {
      const normalizedCity = normalize(city);
      return !normalizedCity.startsWith(needle) && normalizedCity.includes(needle);
    });

    return [...starts, ...contains].slice(0, 10);
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
    if (nextValue !== value) onChange("");
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
      <div className={`flex items-center rounded-2xl border bg-slate-50 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 ${selected ? "border-emerald-300" : "border-slate-200"} ${disabled ? "opacity-60" : ""}`}>
        <Search className="ml-4 shrink-0 text-slate-400" size={18} />
        <input
          value={query}
          onChange={(event) => handleInput(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 140);
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={loading ? "Cargando ciudades..." : placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="min-w-0 flex-1 bg-transparent px-3 py-3.5 font-bold outline-none placeholder:font-semibold placeholder:text-slate-400"
        />
        {query && !disabled ? (
          <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={clearCity} aria-label="Limpiar ciudad" className="mr-2 rounded-full p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700">
            <X size={16} />
          </button>
        ) : (
          <ChevronDown className="mr-4 text-slate-400" size={18} />
        )}
      </div>

      {open && !disabled && (
        <div role="listbox" className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${isActive ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isSelected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {isSelected ? <Check size={17} /> : <MapPin size={17} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-black">{city}</span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-5 text-center">
              <p className="font-black text-slate-700">No encontramos esa ciudad</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Revisa la escritura o prueba con menos letras.</p>
            </div>
          )}
        </div>
      )}

      {query && !selected && (
        <p className="mt-1.5 text-xs font-semibold text-amber-700">Selecciona una ciudad de la lista para continuar.</p>
      )}
    </div>
  );
}
