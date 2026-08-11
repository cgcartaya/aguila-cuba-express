"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  deleteMenuCategory,
  saveMenuCategory,
} from "@/lib/services/menu";

type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type Props = {
  storeId: string;
  categories: Category[];
  onChange: () => void;
};

export default function CategoryManager({ storeId, categories, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await saveMenuCategory(storeId, {
      name: name.trim(),
      sort_order: categories.length,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      alert("No se pudo crear la categoría.");
      return;
    }
    setName("");
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

  const handleToggleActive = async (category: Category) => {
    const { error } = await saveMenuCategory(storeId, {
      id: category.id,
      name: category.name,
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
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Categorías
        </h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200"
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
              placeholder="Ej: Alitas & Tenders"
              className="w-40 border-none text-xs font-bold outline-none"
            />
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
