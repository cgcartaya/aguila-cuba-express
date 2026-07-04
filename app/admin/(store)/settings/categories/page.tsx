"use client";

/* =========================================================
   CATEGORÍAS - ADMIN
========================================================= */

import { useEffect, useState } from "react";
import { Loader2, Plus, Tag, Trash2 } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminInput from "@/components/admin/ui/AdminInput";

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "@/lib/services/settings";

import type { Category } from "@/components/admin/settings/types";
import { getCategoryIcon } from "@/lib/utils/category-icons";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    name: "",
    color: "#2563EB",
    sort_order: "0",
    is_active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    setLoading(true);

    const { data } = await getCategories();

    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreate = async () => {
    if (!form.name) return;

    setSaving(true);

    await createCategory({
      name: form.name,
      slug: createSlug(form.name),
      color: form.color,
      icon: getCategoryIcon(form.name),
      sort_order: Number(form.sort_order || 0),
      is_active: form.is_active,
    });

    setForm({
      name: "",
      color: "#2563EB",
      sort_order: "0",
      is_active: true,
    });

    await loadCategories();
    setSaving(false);
  };

  const handleUpdate = async (
    id: string,
    field: keyof Category,
    value: string | number | boolean
  ) => {
    if (field === "name") {
      const newName = String(value);

      await updateCategory(id, {
        name: newName,
        slug: createSlug(newName),
        icon: getCategoryIcon(newName),
      });

      setCategories((prev) =>
        prev.map((category) =>
          category.id === id
            ? {
                ...category,
                name: newName,
                slug: createSlug(newName),
                icon: getCategoryIcon(newName),
              }
            : category
        )
      );

      return;
    }

    await updateCategory(id, {
      [field]: value,
    });

    setCategories((prev) =>
      prev.map((category) =>
        category.id === id
          ? {
              ...category,
              [field]: value,
            }
          : category
      )
    );
  };

  const handleDelete = async (id: string) => {
    const ok = confirm("¿Seguro que quieres eliminar esta categoría?");
    if (!ok) return;

    await deleteCategory(id);
    await loadCategories();
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="mx-auto max-w-6xl">
        <AdminBackButton />

        <AdminPageHeader
          title="Categorías"
          description="Crea y administra las categorías que aparecerán en la tienda. El sistema genera automáticamente el slug y el icono."
          badge="Catálogo"
          icon={Tag}
        />

        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-[#0B1F4D]">
            Nueva categoría
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <AdminInput
              label="Nombre"
              value={form.name}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  name: value,
                }))
              }
              placeholder="Ej: Alimentos"
            />

            <div>
              <label className="mb-2 block text-sm font-bold text-[#0B1F4D]">
                Color
              </label>

              <input
                type="color"
                value={form.color}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    color: e.target.value,
                  }))
                }
                className="h-[50px] w-full rounded-2xl border border-slate-200 bg-white px-2"
              />
            </div>

            <AdminInput
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  sort_order: value,
                }))
              }
              placeholder="0"
            />

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-blue-50/40 px-4 py-3">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
                className="h-5 w-5"
              />

              <span className="font-bold text-[#0B1F4D]">Activa</span>
            </label>
          </div>

          <p className="mt-3 text-xs font-medium text-slate-500">
            El slug y el icono se generan automáticamente desde el nombre.
          </p>

          <div className="mt-5">
            <AdminButton
              onClick={handleCreate}
              disabled={saving || !form.name}
              icon={saving ? Loader2 : Plus}
            >
              {saving ? "Guardando..." : "Crear categoría"}
            </AdminButton>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-[#0B1F4D]">
            Categorías existentes
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="animate-spin" size={20} />
              Cargando categorías...
            </div>
          ) : categories.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
              Todavía no hay categorías creadas.
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50/20 lg:grid-cols-5"
                >
                  <AdminInput
                    label="Nombre"
                    value={category.name}
                    onChange={(value) =>
                      handleUpdate(category.id, "name", value)
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-bold text-[#0B1F4D]">
                      Color
                    </label>

                    <input
                      type="color"
                      value={category.color || "#2563EB"}
                      onChange={(e) =>
                        handleUpdate(category.id, "color", e.target.value)
                      }
                      className="h-[50px] w-full rounded-2xl border border-slate-200 bg-white px-2"
                    />
                  </div>

                  <AdminInput
                    label="Orden"
                    type="number"
                    value={String(category.sort_order || 0)}
                    onChange={(value) =>
                      handleUpdate(category.id, "sort_order", Number(value))
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-bold text-[#0B1F4D]">
                      Slug automático
                    </label>

                    <div className="flex h-[50px] items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-500">
                      {category.slug}
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdate(
                          category.id,
                          "is_active",
                          !category.is_active
                        )
                      }
                      className={`h-[50px] flex-1 rounded-2xl px-4 font-bold transition ${
                        category.is_active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {category.is_active ? "Activa" : "Inactiva"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(category.id)}
                      className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl bg-red-50 text-red-600 transition hover:bg-red-100"
                      aria-label="Eliminar categoría"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}