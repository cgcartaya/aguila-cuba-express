"use client";

/* =========================================================
   COMBO FORM - COMBOS ADMIN

   Formulario principal para crear combos.
   Une:
   - Datos generales
   - Imagen
   - Productos seleccionados
   - Cálculo de precio
========================================================= */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

import ProductSelector from "./ProductSelector";
import ComboPriceCalculator from "./ComboPriceCalculator";
import ComboImageUploader from "./ComboImageUploader";

import { createCombo, addProductToCombo } from "@/lib/services/combos";

import type {
  ComboFormData,
  ComboProduct,
  SelectedComboProduct,
} from "./types";

type ComboFormProps = {
  products: ComboProduct[];
};

export default function ComboForm({ products }: ComboFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<
    SelectedComboProduct[]
  >([]);

  const [formData, setFormData] = useState<ComboFormData>({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    is_active: true,
  });

  /* =========================================================
     VALIDACIÓN Y GUARDADO DEL COMBO
  ========================================================= */

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert("Escribe el nombre del combo.");
      return;
    }

    if (selectedProducts.length === 0) {
      alert("Agrega al menos un producto al combo.");
      return;
    }

    if (Number(formData.price) <= 0) {
      alert("El precio del combo debe ser mayor que 0.");
      return;
    }

    try {
      setLoading(true);

      /* Crear combo principal */
      const { data: combo, error: comboError } = await createCombo({
        name: formData.name,
        description: formData.description,
        image_url: formData.image_url || "",
        price: Number(formData.price),
        is_active: formData.is_active,
      });

      if (comboError || !combo) {
        console.error("Error creando combo:", comboError);
        alert("No se pudo crear el combo.");
        return;
      }

      /* Crear productos incluidos */
      for (const item of selectedProducts) {
        const { error } = await addProductToCombo({
          combo_id: combo.id,
          product_id: item.product.id,
          quantity: item.quantity,
        });

        if (error) {
          console.error("Error agregando producto al combo:", error);
          alert("El combo se creó, pero ocurrió un error agregando productos.");
          return;
        }
      }

      router.push("/admin/combos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-[#061b3a]">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin/combos"
              className="mb-3 inline-flex items-center gap-2 text-sm font-black text-slate-500"
            >
              <ArrowLeft size={17} />
              Volver a combos
            </Link>

            <h1 className="text-3xl font-black">
              Crear nuevo combo
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Selecciona productos existentes y define un precio final.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            <Save size={18} />
            {loading ? "Guardando..." : "Guardar combo"}
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* COLUMNA IZQUIERDA */}
          <section className="space-y-6 lg:col-span-2">
            {/* DATOS GENERALES */}
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-[#061b3a]">
                Información del combo
              </h2>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Estos datos serán visibles en la tienda pública.
              </p>

              <div className="mt-5 grid gap-4">
                <label>
                  <span className="text-sm font-black">
                    Nombre del combo
                  </span>

                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((current) => ({
                        ...current,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Ej: Combo familiar de alimentos"
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-600"
                  />
                </label>

                <label>
                  <span className="text-sm font-black">
                    Descripción
                  </span>

                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((current) => ({
                        ...current,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Describe qué incluye este combo..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-600"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData((current) => ({
                        ...current,
                        is_active: e.target.checked,
                      }))
                    }
                    className="h-5 w-5"
                  />

                  <span className="text-sm font-black">
                    Mostrar combo activo en la tienda
                  </span>
                </label>
              </div>
            </div>

            <ProductSelector
              products={products}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
            />
          </section>

          {/* COLUMNA DERECHA */}
          <aside className="space-y-6">
            <ComboImageUploader
              formData={formData}
              setFormData={setFormData}
            />

            <ComboPriceCalculator
              formData={formData}
              setFormData={setFormData}
              selectedProducts={selectedProducts}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}