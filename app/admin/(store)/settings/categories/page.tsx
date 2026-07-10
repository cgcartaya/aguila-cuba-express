"use client";

/* =========================================================
   CATEGORÍAS - ADMIN MULTITIENDA
========================================================= */

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Tag, Trash2 } from "lucide-react";

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

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadCategories = async () => {
    if (accessLoading || storeLoading) return;

    if (!activeStore?.id) {
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await getCategoriesByStoreId(activeStore.id);

      if (error) {
        console.error("Error cargando categorías:", error);
        setCategories([]);
        setFeedback({
          type: "error",
          message: getErrorMessage(
            error,
            "No se pudieron cargar las categorías."
          ),
        });
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("Error inesperado cargando categorías:", error);
      setCategories([]);
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Ocurrió un error inesperado al cargar las categorías."
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessLoading, storeLoading, activeStore?.id]);

  const handleCreate = async () => {
    const name = form.name.trim();

    if (!name) {
      setFeedback({
        type: "error",
        message: "Escribe el nombre de la categoría.",
      });
      return;
    }

    if (!activeStore?.id) {
      setFeedback({
        type: "error",
        message: "No se encontró la tienda activa.",
      });
      return;
    }

    const slug = createSlug(name);

    if (!slug) {
      setFeedback({
        type: "error",
        message: "El nombre no permite generar un slug válido.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const { error } = await createCategoryForStore(activeStore.id, {
        name,
        slug,
        color: form.color,
        icon: getCategoryIcon(name),
        sort_order: Number(form.sort_order || 0),
        is_active: form.is_active,
      });

      if (error) {
        console.error("Error creando categoría:", error);
        setFeedback({
          type: "error",
          message: getErrorMessage(
            error,
            "No se pudo crear la categoría."
          ),
        });
        return;
      }

      setForm({
        name: "",
        color: "#2563EB",
        sort_order: "0",
        is_active: true,
      });

      setFeedback({
        type: "success",
        message: `La categoría "${name}" se creó correctamente.`,
      });

      await loadCategories();
    } catch (error) {
      console.error("Error inesperado creando categoría:", error);
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Ocurrió un error inesperado al crear la categoría."
        ),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (
    id: string,
    field: keyof Category,
    value: string | number | boolean
  ) => {
    if (!activeStore?.id) {
      setFeedback({
        type: "error",
        message: "No se encontró la tienda activa.",
      });
      return;
    }

    setFeedback(null);

    try {
      if (field === "name") {
        const newName = String(value).trim();
        const newSlug = createSlug(newName);

        if (!newName || !newSlug) {
          setFeedback({
            type: "error",
            message: "El nombre de la categoría no puede estar vacío.",
          });
          return;
        }

        const { error } = await updateCategory(
          id,
          {
            name: newName,
            slug: newSlug,
            icon: getCategoryIcon(newName),
          },
          activeStore.id
        );

        if (error) {
          console.error("Error actualizando categoría:", error);
          setFeedback({
            type: "error",
            message: getErrorMessage(
              error,
              "No se pudo actualizar la categoría."
            ),
          });
          await loadCategories();
          return;
        }

        setCategories((prev) =>
          prev.map((category) =>
            category.id === id
              ? {
                  ...category,
                  name: newName,
                  slug: newSlug,
                  icon: getCategoryIcon(newName),
                }
              : category
          )
        );

        setFeedback({
          type: "success",
          message: "Categoría actualizada correctamente.",
        });

        return;
      }

      const { error } = await updateCategory(
        id,
        {
          [field]: value,
        },
        activeStore.id
      );

      if (error) {
        console.error("Error actualizando categoría:", error);
        setFeedback({
          type: "error",
          message: getErrorMessage(
            error,
            "No se pudo actualizar la categoría."
          ),
        });
        await loadCategories();
        return;
      }

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

      setFeedback({
        type: "success",
        message: "Categoría actualizada correctamente.",
      });
    } catch (error) {
      console.error("Error inesperado actualizando categoría:", error);
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Ocurrió un error inesperado al actualizar la categoría."
        ),
      });
      await loadCategories();
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeStore?.id) {
      setFeedback({
        type: "error",
        message: "No se encontró la tienda activa.",
      });
      return;
    }

    const ok = window.confirm(
      "¿Seguro que quieres eliminar esta categoría?"
    );

    if (!ok) return;

    setDeletingId(id);
    setFeedback(null);

    try {
      const { error } = await deleteCategory(id, activeStore.id);

      if (error) {
        console.error("Error eliminando categoría:", error);
        setFeedback({
          type: "error",
          message: getErrorMessage(
            error,
            "No se pudo eliminar la categoría."
          ),
        });
        return;
      }

      setCategories((prev) =>
        prev.filter((category) => category.id !== id)
      );

      setFeedback({
        type: "success",
        message: "Categoría eliminada correctamente.",
      });
    } catch (error) {
      console.error("Error inesperado eliminando categoría:", error);
      setFeedback({
        type: "error",
        message: getErrorMessage(
          error,
          "Ocurrió un error inesperado al eliminar la categoría."
        ),
      });
    } finally {
      setDeletingId(null);
    }
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

        {feedback ? (
          <div
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
              feedback.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="mt-0.5 shrink-0" size={18} />
            ) : (
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
            )}
            <span>{feedback.message}</span>
          </div>
        ) : null}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Nueva categoría</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_160px_180px]">
            <AdminInput
              label="Nombre"
              value={form.name}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, name: value }))
              }
              placeholder="Ej: Monitores"
            />

            <AdminInput
              label="Color"
              type="color"
              value={form.color}
              onChange={(value) =>
                setForm((prev) => ({ ...prev, color: value }))
              }
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
              disabled={saving || !activeStore?.id || !form.name.trim()}
              icon={saving ? Loader2 : Plus}
            >
              {saving ? "Creando..." : "Crear categoría"}
            </AdminButton>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-black">Categorías existentes</h2>

          {loading ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Cargando categorías...
            </div>
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
                      void handleUpdate(category.id, "name", value)
                    }
                  />

                  <AdminInput
                    label="Color"
                    type="color"
                    value={category.color}
                    onChange={(value) =>
                      void handleUpdate(category.id, "color", value)
                    }
                  />

                  <AdminInput
                    label="Orden"
                    type="number"
                    value={String(category.sort_order ?? 0)}
                    onChange={(value) =>
                      void handleUpdate(
                        category.id,
                        "sort_order",
                        Number(value || 0)
                      )
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
                      void handleUpdate(
                        category.id,
                        "is_active",
                        !category.is_active
                      )
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
                    onClick={() => void handleDelete(category.id)}
                    disabled={deletingId === category.id}
                    aria-label={`Eliminar categoría ${category.name}`}
                    className="flex items-center justify-center rounded-2xl bg-red-50 text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === category.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Trash2 size={18} />
                    )}
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
