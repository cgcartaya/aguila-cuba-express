"use client";

/* =========================================================
   CATEGORÍAS - ADMIN

   Versión SaaS:
   - El cliente solo gestiona nombre, color, orden y estado.
   - El slug se genera automáticamente desde el nombre.
   - El icono se asigna automáticamente según el nombre.
========================================================= */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Tag,
  Trash2,
} from "lucide-react";

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
    color: "#111827",
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
      color: "#111827",
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
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver a ajustes
        </Link>

        <section className="mb-8 rounded-[2rem] bg-black p-8 text-white">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
            <Tag size={16} />
            Catálogo
          </div>

          <h1 className="text-3xl font-bold md:text-5xl">
            Categorías
          </h1>

          <p className="mt-3 max-w-2xl text-white/70">
            Crea y administra las categorías que aparecerán en la tienda. El
            sistema genera automáticamente el slug y el icono.
          </p>
        </section>

        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">
            Nueva categoría
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <Input
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
              <label className="mb-2 block text-sm font-bold text-gray-700">
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
                className="h-[50px] w-full rounded-2xl border bg-white px-2"
              />
            </div>

            <Input
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

            <label className="flex items-center gap-3 rounded-2xl border px-4 py-3">
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

              <span className="font-bold text-gray-800">
                Activa
              </span>
            </label>
          </div>

          <p className="mt-3 text-xs font-medium text-gray-500">
            El slug y el icono se generan automáticamente desde el nombre.
          </p>

          <button
            onClick={handleCreate}
            disabled={saving || !form.name}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-black px-5 py-3 font-bold text-white disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Guardando...
              </>
            ) : (
              <>
                <Plus size={20} />
                Crear categoría
              </>
            )}
          </button>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">
            Categorías existentes
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="animate-spin" size={20} />
              Cargando categorías...
            </div>
          ) : categories.length === 0 ? (
            <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
              Todavía no hay categorías creadas.
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="grid gap-3 rounded-2xl border p-4 lg:grid-cols-5"
                >
                  <Input
                    label="Nombre"
                    value={category.name}
                    onChange={(value) =>
                      handleUpdate(category.id, "name", value)
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Color
                    </label>

                    <input
                      type="color"
                      value={category.color || "#111827"}
                      onChange={(e) =>
                        handleUpdate(
                          category.id,
                          "color",
                          e.target.value
                        )
                      }
                      className="h-[50px] w-full rounded-2xl border bg-white px-2"
                    />
                  </div>

                  <Input
                    label="Orden"
                    type="number"
                    value={String(category.sort_order || 0)}
                    onChange={(value) =>
                      handleUpdate(
                        category.id,
                        "sort_order",
                        Number(value)
                      )
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-bold text-gray-700">
                      Slug automático
                    </label>

                    <div className="flex h-[50px] items-center rounded-2xl border bg-gray-50 px-4 text-sm font-semibold text-gray-500">
                      {category.slug}
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <button
                      onClick={() =>
                        handleUpdate(
                          category.id,
                          "is_active",
                          !category.is_active
                        )
                      }
                      className={`h-[50px] flex-1 rounded-2xl px-4 font-bold ${
                        category.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {category.is_active ? "Activa" : "Inactiva"}
                    </button>

                    <button
                      onClick={() => handleDelete(category.id)}
                      className="flex h-[50px] w-[50px] items-center justify-center rounded-2xl bg-red-50 text-red-600"
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

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border px-4 py-3 outline-none focus:border-black"
      />
    </div>
  );
}