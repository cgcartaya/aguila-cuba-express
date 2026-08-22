"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Search, Trash2, UtensilsCrossed, Wine } from "lucide-react";

import type { EligibleDailyMenuItem } from "@/lib/menu/types";

type VenueFilter = "all" | "restaurant" | "bar";

type Props = {
  items: EligibleDailyMenuItem[];
  members: string[];
  busyId: string | null;
  todayQuota: Record<string, number | null>;
  draftQty: Record<string, string>;
  setDraftQty: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAdd: (item: EligibleDailyMenuItem) => void | Promise<void>;
  onRemove: (item: EligibleDailyMenuItem) => void | Promise<void>;
  onSaveQuota: (item: EligibleDailyMenuItem) => void | Promise<void>;
};

function venueMatches(item: EligibleDailyMenuItem, venue: VenueFilter) {
  if (venue === "all") return true;
  const type = item.category?.venue_type || "general";
  return type === venue || type === "general";
}

function groupByCategory(items: EligibleDailyMenuItem[]) {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      venue_type: "bar" | "restaurant" | "general";
      sort_order: number;
      items: EligibleDailyMenuItem[];
    }
  >();

  for (const item of items) {
    const category = item.category || {
      id: item.category_id || "sin-categoria",
      name: "Sin categoría",
      venue_type: "general" as const,
      sort_order: 9999,
    };

    const existing = map.get(category.id);
    if (existing) existing.items.push(item);
    else map.set(category.id, { ...category, items: [item] });
  }

  return [...map.values()]
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name))
    .map((group) => ({
      ...group,
      items: [...group.items].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

function VenueButtons({
  value,
  onChange,
}: {
  value: VenueFilter;
  onChange: (value: VenueFilter) => void;
}) {
  const options: { value: VenueFilter; label: string; icon?: typeof UtensilsCrossed }[] = [
    { value: "all", label: "Todos" },
    { value: "restaurant", label: "Restaurante", icon: UtensilsCrossed },
    { value: "bar", label: "Bar", icon: Wine },
  ];

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {options.map(({ value: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition ${
            value === option
              ? "bg-[#071B35] text-white"
              : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          {Icon ? <Icon size={12} /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

function CategoryPills({
  groups,
  activeId,
  onChange,
}: {
  groups: ReturnType<typeof groupByCategory>;
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black transition ${
          activeId === "all"
            ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100"
            : "bg-slate-50 text-slate-500 hover:bg-slate-100"
        }`}
      >
        Todas ({groups.reduce((sum, group) => sum + group.items.length, 0)})
      </button>

      {groups.map((group) => (
        <button
          key={group.id}
          type="button"
          onClick={() => onChange(group.id)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black transition ${
            activeId === group.id
              ? "bg-orange-50 text-orange-600 ring-1 ring-orange-100"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100"
          }`}
        >
          {group.name} ({group.items.length})
        </button>
      ))}
    </div>
  );
}

export default function DailyMenuDishBuilder({
  items,
  members,
  busyId,
  todayQuota,
  draftQty,
  setDraftQty,
  onAdd,
  onRemove,
  onSaveQuota,
}: Props) {
  const [catalogSearch, setCatalogSearch] = useState("");
  const [assignedSearch, setAssignedSearch] = useState("");
  const [catalogVenue, setCatalogVenue] = useState<VenueFilter>("all");
  const [assignedVenue, setAssignedVenue] = useState<VenueFilter>("all");
  const [catalogCategory, setCatalogCategory] = useState("all");
  const [assignedCategory, setAssignedCategory] = useState("all");

  const catalogItems = useMemo(
    () => items.filter((item) => !members.includes(item.id)),
    [items, members]
  );
  const assignedItems = useMemo(
    () => items.filter((item) => members.includes(item.id)),
    [items, members]
  );

  const catalogBaseGroups = useMemo(
    () => groupByCategory(catalogItems.filter((item) => venueMatches(item, catalogVenue))),
    [catalogItems, catalogVenue]
  );
  const assignedBaseGroups = useMemo(
    () => groupByCategory(assignedItems.filter((item) => venueMatches(item, assignedVenue))),
    [assignedItems, assignedVenue]
  );

  const visibleCatalogGroups = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return catalogBaseGroups
      .filter((group) => catalogCategory === "all" || group.id === catalogCategory)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${item.name} ${group.name}`.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [catalogBaseGroups, catalogCategory, catalogSearch]);

  const visibleAssignedGroups = useMemo(() => {
    const q = assignedSearch.trim().toLowerCase();
    return assignedBaseGroups
      .filter((group) => assignedCategory === "all" || group.id === assignedCategory)
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${item.name} ${group.name}`.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [assignedBaseGroups, assignedCategory, assignedSearch]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 p-4 backdrop-blur">
          <div>
            <h3 className="font-black text-[#071B35]">Catálogo de platillos</h3>
            <p className="text-[11px] font-semibold text-slate-400">
              {catalogItems.length} disponibles para agregar
            </p>
          </div>

          <label className="relative mt-3 block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Buscar platillo o categoría..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-orange-300"
            />
          </label>

          <div className="mt-3">
            <VenueButtons
              value={catalogVenue}
              onChange={(value) => {
                setCatalogVenue(value);
                setCatalogCategory("all");
              }}
            />
          </div>

          <div className="mt-2">
            <CategoryPills
              groups={catalogBaseGroups}
              activeId={catalogCategory}
              onChange={setCatalogCategory}
            />
          </div>
        </div>

        <div className="max-h-[620px] overflow-y-auto p-2">
          {visibleCatalogGroups.map((group) => (
            <div key={group.id} className="mb-3 last:mb-0">
              <div className="sticky top-0 z-[1] flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black uppercase tracking-wide text-slate-600">
                    {group.name}
                  </p>
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    {group.venue_type === "bar"
                      ? "Bar"
                      : group.venue_type === "restaurant"
                        ? "Restaurante"
                        : "General"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-slate-400 ring-1 ring-slate-200">
                  {group.items.length}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-800">{item.name}</p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-400">
                        ${item.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onAdd(item)}
                      disabled={busyId === item.id}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#071B35] text-white disabled:opacity-40"
                      title="Agregar al menú"
                    >
                      {busyId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {visibleCatalogGroups.length === 0 && (
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              No hay platillos para mostrar con estos filtros.
            </div>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 p-4 backdrop-blur">
          <div>
            <h3 className="font-black text-[#071B35]">
              En este menú <span className="text-slate-400">({assignedItems.length})</span>
            </h3>
            <p className="text-[11px] font-semibold text-slate-400">
              Platillos visibles cuando este menú esté activo.
            </p>
          </div>

          <label className="relative mt-3 block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={assignedSearch}
              onChange={(e) => setAssignedSearch(e.target.value)}
              placeholder="Buscar en este menú..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-semibold outline-none focus:border-orange-300"
            />
          </label>

          <div className="mt-3">
            <VenueButtons
              value={assignedVenue}
              onChange={(value) => {
                setAssignedVenue(value);
                setAssignedCategory("all");
              }}
            />
          </div>

          <div className="mt-2">
            <CategoryPills
              groups={assignedBaseGroups}
              activeId={assignedCategory}
              onChange={setAssignedCategory}
            />
          </div>
        </div>

        <div className="max-h-[620px] overflow-y-auto p-2">
          {visibleAssignedGroups.map((group) => (
            <div key={group.id} className="mb-3 last:mb-0">
              <div className="sticky top-0 z-[1] flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-black uppercase tracking-wide text-slate-600">
                    {group.name}
                  </p>
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    {group.venue_type === "bar"
                      ? "Bar"
                      : group.venue_type === "restaurant"
                        ? "Restaurante"
                        : "General"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-slate-400 ring-1 ring-slate-200">
                  {group.items.length}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {group.items.map((item) => {
                  const draft = draftQty[item.id] ?? String(todayQuota[item.id] ?? "");
                  return (
                    <div key={item.id} className="rounded-xl px-2 py-2.5 hover:bg-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-800">{item.name}</p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-400">
                            ${item.price.toFixed(2)}
                          </p>
                        </div>
                        <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-600 sm:inline-flex">
                          En menú
                        </span>
                        <button
                          type="button"
                          onClick={() => onRemove(item)}
                          disabled={busyId === item.id}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          title="Quitar del menú"
                        >
                          {busyId === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>

                      {item.daily_stock_enabled && (
                        <div className="ml-14 mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-orange-50/60 px-3 py-2">
                          <span className="text-[10px] font-black uppercase text-orange-600">Cupo hoy</span>
                          <input
                            type="number"
                            min={0}
                            value={draft}
                            onChange={(e) =>
                              setDraftQty((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className="w-20 rounded-lg border border-orange-100 bg-white px-2 py-1 text-xs font-bold outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => onSaveQuota(item)}
                            className="rounded-lg bg-[#071B35] px-2.5 py-1 text-[10px] font-black text-white"
                          >
                            Guardar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {visibleAssignedGroups.length === 0 && (
            <div className="p-8 text-center text-xs font-semibold text-slate-400">
              Este menú no tiene platillos que coincidan con los filtros.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
