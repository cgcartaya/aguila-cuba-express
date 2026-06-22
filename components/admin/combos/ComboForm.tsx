"use client";

/* =========================================================
   COMBO FORM - COMBOS ADMIN

   Formulario reutilizable para:
   - Crear combos
   - Editar combos

   Maneja:
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

import {
  createCombo,
  updateCombo,
  addProductToCombo,
  removeProductFromCombo,
} from "@/lib/services/combos";

import type {
  ComboFormData,
  ComboProduct,
  SelectedComboProduct,
} from "./types";

type ComboFormProps = {
  products: ComboProduct[];

  mode?: "create" | "edit";

  comboId?: string;

  initialData?: ComboFormData;

  initialProducts?: SelectedComboProduct[];
};

export default function ComboForm({
  products,
  mode = "create",
  comboId,
  initialData,
  initialProducts = [],
}: ComboFormProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const [selectedProducts, setSelectedProducts] =
    useState<SelectedComboProduct[]>(initialProducts);

  const [formData, setFormData] = useState<ComboFormData>(
    initialData || {
      name: "",
      description: "",
      price: 0,
      image_url: "",
      is_active: true,
    }
  );

  /* =========================================================
     VALIDACIÓN GENERAL
  ========================================================= */

  const validateForm = () => {
    if (!formData.name.trim()) {
      alert("Escribe el nombre del combo.");
      return false;
    }

    if (selectedProducts.length === 0) {
      alert("Agrega al menos un producto al combo.");
      return false;
    }

    if (Number(formData.price) <= 0) {
      alert("El precio del combo debe ser mayor que 0.");
      return false;
    }

    if (mode === "edit" && !comboId) {
      alert("No se encontró el ID del combo.");
      return false;
    }

    return true;
  };

  /* =========================================================
     CREAR COMBO
  ========================================================= */

  const handleCreate = async () => {
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
  };

  /* =========================================================
     EDITAR COMBO

     Estrategia simple y segura:
     1. Actualizamos la tabla combos.
     2. Eliminamos los combo_items actuales.
     3. Insertamos nuevamente los productos seleccionados.

     Esto evita problemas de sincronización cuando:
     - Se quita un producto
     - Se agrega otro
     - Se cambia la cantidad
  ========================================================= */

  const handleEdit = async () => {
    if (!comboId) return;

    const { error: comboError } = await updateCombo(comboId, {
      name: formData.name,
      description: formData.description,
      image_url: formData.image_url || "",
      price: Number(formData.price),
      is_active: formData.is_active,
    });

    if (comboError) {
      console.error("Error actualizando combo:", comboError);
      alert("No se pudo actualizar el combo.");
      return;
    }

    for (const item of initialProducts) {
      if (item.combo_item_id) {
        const { error } = await removeProductFromCombo(item.combo_item_id);

        if (error) {
          console.error("Error eliminando producto anterior:", error);
          alert("No se pudieron actualizar los productos del combo.");
          return;
        }
      }
    }

    for (const item of selectedProducts) {
      const { error } = await addProductToCombo({
        combo_id: comboId,
        product_id: item.product.id,
        quantity: item.quantity,
      });

      if (error) {
        console.error("Error agregando producto actualizado:", error);
        alert("No se pudieron guardar los productos del combo.");
        return;
      }
    }

    router.push("/admin/combos");
  };

  /* =========================================================
     SUBMIT GENERAL
  ========================================================= */

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (mode === "edit") {
        await handleEdit();
      } else {
        await handleCreate();
      }
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
              {mode === "edit" ? "Editar combo" : "Crear nuevo combo"}
            </h1>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {mode === "edit"
                ? "Actualiza la información, productos e imagen del combo."
                : "Selecciona productos existentes y define un precio final."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-700 disabled:opacity-60"
          >
            <Save size={18} />
            {loading
              ? "Guardando..."
              : mode === "edit"
              ? "Actualizar combo"
              : "Guardar combo"}
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