"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";

import MenuItemImageUploader from "./MenuItemImageUploader";
import ModifierTemplatePicker from "./ModifierTemplatePicker";
import OptionGroupsEditor from "./OptionGroupsEditor";
import { saveMenuItem } from "@/lib/services/menu";
import type { MenuItemFormData } from "@/lib/menu/types";

type Category = { id: string; name: string };

type Props = {
  storeId: string;
  categories: Category[];
  initialData: MenuItemFormData;
};

export default function MenuItemForm({ storeId, categories, initialData }: Props) {
  const router = useRouter();
  const [formData, setFormData] = useState<MenuItemFormData>(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return setError("El nombre es obligatorio.");
    if (!formData.category_id) return setError("Elige una categoría.");

    setSaving(true);
    setError(null);

    const { error: saveError } = await saveMenuItem(storeId, formData);

    setSaving(false);

    if (saveError) {
      setError("No se pudo guardar el platillo.");
      console.error(saveError);
      return;
    }

    router.push("/admin/menu");
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/admin/menu"
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} /> Volver al menú
      </Link>

      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <MenuItemImageUploader formData={formData} setFormData={setFormData} />

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                Nombre
              </label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Bistec de Res"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Categoría
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none"
                >
                  <option value="">Elige...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
                  Precio
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, price: Number(e.target.value) || 0 }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-500">
            Descripción
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold outline-none"
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
            }
          />
          Visible en el menú público
        </label>

        <label className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={formData.is_featured}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, is_featured: e.target.checked }))
            }
          />
          Destacar en la landing
        </label>

        <div className="mt-4 rounded-2xl bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={formData.track_stock}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, track_stock: e.target.checked }))
              }
            />
            Inventario permanente
          </label>

          {formData.track_stock && (
            <input
              type="number"
              min={0}
              value={formData.stock}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  stock: Math.max(0, Number(e.target.value) || 0),
                }))
              }
              className="mt-2 w-32 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
            />
          )}
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={formData.daily_stock_enabled}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, daily_stock_enabled: e.target.checked }))
              }
            />
            Cupo diario
          </label>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <ModifierTemplatePicker
          storeId={storeId}
          groups={formData.option_groups}
          onChange={(option_groups) =>
            setFormData((prev) => ({ ...prev, option_groups }))
          }
        />

        <div className="mt-5 border-t border-slate-100 pt-5">
          <OptionGroupsEditor
            groups={formData.option_groups}
            onChange={(option_groups) =>
              setFormData((prev) => ({ ...prev, option_groups }))
            }
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-xl bg-[#061b3a] px-6 py-3 text-sm font-black text-white shadow-sm disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Guardar platillo
      </button>
    </form>
  );
}
