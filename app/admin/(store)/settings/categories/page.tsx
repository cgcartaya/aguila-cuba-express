"use client";

/* =========================================================
   CATEGORÍAS - ADMIN MULTITIENDA
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Tag, Trash2 } from "lucide-react";

import AdminPageHeader from "@/components/admin/ui/AdminPageHeader";
import AdminBackButton from "@/components/admin/ui/AdminBackButton";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminInput from "@/components/admin/ui/AdminInput";

import {
  createCategoryForStore,
  deleteCategory,
  getCategoriesByStoreId,
  updateCategory,
} from "@/lib/services/settings";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";

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
  const { loading: accessLoading, isSuperAdmin, store: accessStore } =
    useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(() => {
    if (isSuperAdmin) return selectedStore || accessStore;
    return accessStore;
  }, [accessStore, isSuperAdmin, selectedStore]);

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
    if (accessLoading || storeLoading) return;

    if (!activeStore?.id) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await getCategoriesByStoreId(activeStore.id);

    if (error) {
      console.error("Error cargando categorías:", error);
      setCategories([]);
      setLoading(false);
      return;
    }

    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  const handleCreate = async () => {
    if (!form.name || !activeStore?.id) return;

    setSaving(true);

    await createCategoryForStore(activeStore.id, {
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
    setCategories((prev) => prev.filter((category) => category.id !== id));
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a]">
      <div className="mx-auto max-w-6xl space-y-6">
        <AdminBackButton href="/admin/settings" label="Volver a ajustes" />

        <AdminPageHeader
          badge="Catálogo"
          title="Categorías"
          description={`Crea y administra categorías de ${
            activeStore?.name || "la tienda activa"
          }.`}
          actionLabel="Ver tienda"
          actionHref={
            activeStore?.slug && activeStore.slug !== "aguila"
              ? `/tienda/${activeStore.slug}`
              : "/tienda"
          }
          icon={Tag}
        />

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Nueva categoría</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_160px_180px]">
            <AdminInput
              label="Nombre"
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              placeholder="Ej: Monitores"
            />

            <AdminInput
              label="Color"
              type="color"
              value={form.color}
              onChange={(value) => setForm((prev) => ({ ...prev, color: value }))}
            />

            <AdminInput
              label="Orden"
              type="number"
              value={form.sort_order}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, sort_order: value }))
              }
            />

            <label className="flex items-center gap-3 rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-black">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: event.target.checked,
                  }))
                }
              />
              Activa
            </label>
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-500">
            El slug y el ícono se generan automáticamente desde el nombre.
          </p>

          <div className="mt-5">
            <AdminButton
              onClick={handleCreate}
              disabled={saving || !activeStore?.id}
              icon={saving ? Loader2 : Plus}
            >
              {saving ? "Creando..." : "Crear categoría"}
            </AdminButton>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-black">Categorías existentes</h2>

          {loading ? (
            <p className="text-sm font-semibold text-slate-500">
              Cargando categorías...
            </p>
          ) : categories.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">
              Esta tienda todavía no tiene categorías.
            </p>
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="grid gap-3 rounded-2xl border border-slate-100 p-4 md:grid-cols-[1fr_180px_130px_160px_130px_50px]"
                >
                  <AdminInput
                    label="Nombre"
                    value={category.name}
                    onChange={(value) =>
                      handleUpdate(category.id, "name", value)
                    }
                  />

                  <AdminInput
                    label="Color"
                    type="color"
                    value={category.color}
                    onChange={(value) =>
                      handleUpdate(category.id, "color", value)
                    }
                  />

                  <AdminInput
                    label="Orden"
                    type="number"
                    value={String(category.sort_order ?? 0)}
                    onChange={(value) =>
                      handleUpdate(category.id, "sort_order", Number(value || 0))
                    }
                  />

                  <div>
                    <p className="mb-2 text-xs font-black">Slug automático</p>
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500">
                      {category.slug}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleUpdate(category.id, "is_active", !category.is_active)
                    }
                    className={`rounded-2xl px-4 py-3 text-sm font-black ${
                      category.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {category.is_active ? "Activa" : "Inactiva"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(category.id)}
                    className="flex items-center justify-center rounded-2xl bg-red-50 text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
