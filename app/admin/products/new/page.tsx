"use client";

/* =========================================================
   AGREGAR PRODUCTO - ADMIN

   Categorías dinámicas:
   - Las categorías ya no vienen de constants/categories.
   - Ahora se cargan desde Supabase.
   - Si el cliente crea una categoría en Ajustes → Categorías,
     aparece automáticamente aquí.
========================================================= */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Images, Loader2, Save } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { getActiveCategories } from "@/lib/services/settings";
import type { Category } from "@/components/admin/settings/types";

export default function NewProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
    stock: "",
    tag: "",
    is_active: true,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      const { data } = await getActiveCategories();
      setCategories(data || []);
      setLoadingCategories(false);
    }

    loadCategories();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({
      ...prev,
      category: e.target.value,
    }));
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      is_active: e.target.checked,
    }));
  };

  const handleSubmit = async () => {
    setError("");

    if (!form.name || !form.category || !form.price || !form.stock) {
      setError("Completa nombre, categoría, precio y stock.");
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);

    if (Number.isNaN(price) || price < 0) {
      setError("El precio no es válido.");
      return;
    }

    if (Number.isNaN(stock) || stock < 0) {
      setError("El stock no es válido.");
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .insert({
          name: form.name,
          category: form.category,
          description: form.description,
          price,
          stock,
          tag: form.tag,
          is_active: form.is_active,
          image_url: "",
        })
        .select("id")
        .single();

      if (error) throw error;

      router.push(`/admin/products/${data.id}/edit`);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("No se pudo crear el producto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/admin/products"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver a productos
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Agregar producto
          </h1>

          <p className="mt-2 text-gray-500">
            Crea primero el producto. Luego podrás subir varias imágenes.
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              name="name"
              label="Nombre del producto *"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Arroz Gallo"
            />

            <CategorySelect
              value={form.category}
              categories={categories}
              loading={loadingCategories}
              onChange={handleCategoryChange}
            />

            <Input
              name="price"
              label="Precio *"
              type="number"
              value={form.price}
              onChange={handleChange}
              placeholder="0.00"
            />

            <Input
              name="stock"
              label="Stock *"
              type="number"
              value={form.stock}
              onChange={handleChange}
              placeholder="0"
            />

            <Input
              name="tag"
              label="Etiqueta"
              value={form.tag}
              onChange={handleChange}
              placeholder="Ej: Oferta, Nuevo"
            />

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center md:col-span-2">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm">
                <Images size={24} />
              </div>

              <p className="font-bold text-gray-900">
                Las imágenes se agregan después de crear el producto
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Al guardar, irás automáticamente a la pantalla de edición,
                donde podrás subir varias imágenes, escoger la principal y
                eliminar las que no necesites.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Descripción
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Descripción del producto..."
                className="w-full rounded-2xl border px-4 py-3 outline-none focus:border-black"
              />
            </div>

            <label className="flex items-center gap-3 rounded-2xl border p-4 md:col-span-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={handleActiveChange}
                className="h-5 w-5"
              />

              <div>
                <p className="font-bold text-gray-900">Producto activo</p>
                <p className="text-sm text-gray-500">
                  Si está activo, aparecerá en la tienda.
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/products"
              className="rounded-2xl border px-5 py-3 text-center font-bold text-gray-700"
            >
              Cancelar
            </Link>

            <button
              onClick={handleSubmit}
              disabled={loading || categories.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Creando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Crear producto
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-2xl border px-4 py-3 outline-none focus:border-black"
      />
    </div>
  );
}

function CategorySelect({
  value,
  categories,
  loading,
  onChange,
}: {
  value: string;
  categories: Category[];
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        Categoría *
      </label>

      <select
        name="category"
        value={value}
        onChange={onChange}
        disabled={loading || categories.length === 0}
        className="w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:border-black disabled:bg-gray-100 disabled:text-gray-400"
      >
        <option value="">
          {loading ? "Cargando categorías..." : "Selecciona una categoría"}
        </option>

        {categories.map((category) => (
          <option key={category.id} value={category.name}>
            {category.name}
          </option>
        ))}
      </select>

      {!loading && categories.length === 0 && (
        <p className="mt-2 text-xs font-medium text-red-500">
          No hay categorías activas. Ve a Ajustes → Categorías para crear una.
        </p>
      )}
    </div>
  );
}