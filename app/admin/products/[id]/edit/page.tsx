"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import ProductImageManager from "@/components/admin/products/ProductImageManager";

import {
  getProductById,
  updateProduct,
} from "@/lib/services/products";

/* =========================================================
   EDIT PRODUCT PAGE
   ---------------------------------------------------------
   Página para editar la información principal del producto.
   También incluye la nueva galería de imágenes múltiples.
========================================================= */

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  /* =========================================================
     FORM STATE
  ========================================================= */

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    price: "",
     stock: "",
    tag: "",
    is_active: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* =========================================================
     LOAD PRODUCT
  ========================================================= */

  useEffect(() => {
    async function loadProduct() {
      const { data, error } = await getProductById(productId);

      if (error || !data) {
        setError("No se pudo cargar el producto.");
        setLoading(false);
        return;
      }

      setForm({
        name: data.name || "",
        category: data.category || "",
        description: data.description || "",
        price: String(data.price || ""),
        stock: String(data.stock || ""),
        tag: data.tag || "",
        is_active: data.is_active ?? true,
      });

      setLoading(false);
    }

    if (productId) loadProduct();
  }, [productId]);

  /* =========================================================
     FORM HANDLERS
  ========================================================= */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleActiveChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      is_active: e.target.checked,
    }));
  };

  /* =========================================================
     SAVE PRODUCT
  ========================================================= */

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
      setSaving(true);

      const { error } = await updateProduct(productId, {
        name: form.name,
        category: form.category,
        description: form.description,
        price,
        stock,
        tag: form.tag,
        is_active: form.is_active,
      });

      if (error) throw error;

      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("No se pudo actualizar el producto.");
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="animate-spin" size={22} />
          Cargando producto...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <Link
          href="/admin/products"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600"
        >
          <ArrowLeft size={18} />
          Volver a productos
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Editar producto
          </h1>
          <p className="mt-2 text-gray-500">
            Actualiza la información del producto.
          </p>
        </div>

        {/* Información principal */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <Input
              name="name"
              label="Nombre del producto *"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Arroz Gallo"
            />

            <Input
              name="category"
              label="Categoría *"
              value={form.category}
              onChange={handleChange}
              placeholder="Ej: food"
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

            {/* Imagen antigua / temporal.
                La mantenemos para no romper la tienda pública actual.
                Más adelante la tienda usará product_images.is_main. */}


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

          {/* Acciones */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin/products"
              className="rounded-2xl border px-5 py-3 text-center font-bold text-gray-700"
            >
              Cancelar
            </Link>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-5 py-3 font-bold text-white disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Guardando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>

        {/* Galería nueva de imágenes múltiples */}
        <div className="mt-6">
          <ProductImageManager productId={productId} />
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   INPUT REUTILIZABLE
========================================================= */

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