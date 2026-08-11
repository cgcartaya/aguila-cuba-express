"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  deleteMenuCategory,
  saveMenuCategory,
} from "@/lib/services/menu";

type VenueType = "bar" | "restaurant" | "general";

type Category = {
  id: string;
  name: string;
  venue_type: VenueType;
  sort_order: number;
  is_active: boolean;
};

type Props = {
  storeId: string;
  categories: Category[];
  onChange: () => void;
};

const VENUE_TYPE_OPTIONS: { value: VenueType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "bar", label: "Bar" },
  { value: "restaurant", label: "Restaurante" },
];

const VENUE_TYPE_BADGE: Record<VenueType, string> = {
  general: "bg-slate-200 text-slate-600",
  bar: "bg-amber-200 text-amber-800",
  restaurant: "bg-emerald-200 text-emerald-800",
};

const VENUE_TYPE_LABEL: Record<VenueType, string> = {
  general: "General",
  bar: "Bar",
  restaurant: "Restaurante",
};

export default function CategoryManager({ storeId, categories, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [venueType, setVenueType] = useState<VenueType>("general");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await saveMenuCategory(storeId, {
      name: name.trim(),
      venue_type: venueType,
      sort_order: categories.length,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      alert("No se pudo crear la categoría.");
      return;
    }
    setName("");
    setVenueType("general");
    setAdding(false);
    onChange();
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    const category = categories.find((c) => c.id === id);
    if (!category) return;
    const { error } = await saveMenuCategory(storeId, {
      id,
      name: editingName.trim(),
      venue_type: category.venue_type,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    if (error) {
      alert("No se pudo renombrar la categoría.");
      return;
    }
    setEditingId(null);
    onChange();
  };

  const handleChangeVenueType = async (category: Category, venue_type: VenueType) => {
    const { error } = await saveMenuCategory(storeId, {
      id: category.id,
      name: category.name,
      venue_type,
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    if (error) {
      alert("No se pudo actualizar la categoría.");
      return;
    }
    onChange();
  };

  const handleToggleActive = async (category: Category) => {
    const { error } = await saveMenuCategory(storeId, {
      id: category.id,
      name: category.name,
      venue_type: category.venue_type,
      sort_order: category.sort_order,
      is_active: !category.is_active,
    });
    if (error) {
      alert("No se pudo actualizar la categoría.");
      return;
    }
    onChange();
  };

  const handleDelete = async (category: Category) => {
    const confirmDelete = confirm(
      `¿Eliminar "${category.name}"? Esto también elimina todos sus platillos.`
    );
    if (!confirmDelete) return;

    const { error } = await deleteMenuCategory(category.id);
    if (error) {
      alert("No se pudo eliminar la categoría.");
      return;
    }
    onChange();
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Categorías
          </h2>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            Marca cada una como Bar, Restaurante o General. Si tienes de los dos
            tipos, el menú público muestra pestañas para separarlos.
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
          >
            <Plus size={14} />
            Categoría
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) =>
          editingId === category.id ? (
            <div
              key={category.id}
              className="flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1"
            >
              <input
                autoFocus
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename(category.id)}
                className="w-32 border-none text-xs font-bold outline-none"
              />
              <button onClick={() => handleRename(category.id)} className="text-emerald-600">
                <Pencil size={13} />
              </button>
              <button onClick={() => setEditingId(null)} className="text-slate-400">
                <X size={13} />
              </button>
            </div>
          ) : (
            <div
              key={category.id}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                category.is_active
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <button
                onClick={() => handleToggleActive(category)}
                title={category.is_active ? "Ocultar categoría" : "Mostrar categoría"}
              >
                {category.name}
              </button>

              <select
                value={category.venue_type}
                onChange={(e) =>
                  handleChangeVenueType(category, e.target.value as VenueType)
                }
                className={`rounded-full border-none px-2 py-0.5 text-[10px] font-black ${VENUE_TYPE_BADGE[category.venue_type]}`}
                title="Tipo de categoría"
              >
                {VENUE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {VENUE_TYPE_LABEL[opt.value]}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setEditingId(category.id);
                  setEditingName(category.name);
                }}
                className="opacity-70 hover:opacity-100"
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => handleDelete(category)}
                className="opacity-70 hover:opacity-100"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )
        )}

        {adding && (
          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Ej: Cocteles"
              className="w-32 border-none text-xs font-bold outline-none"
            />
            <select
              value={venueType}
              onChange={(e) => setVenueType(e.target.value as VenueType)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold"
            >
              {VENUE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
            <button onClick={() => setAdding(false)} className="text-slate-400">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
