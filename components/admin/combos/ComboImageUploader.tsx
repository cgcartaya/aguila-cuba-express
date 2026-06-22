"use client";

/* =========================================================
   COMBO IMAGE UPLOADER - COMBOS ADMIN

   Maneja la URL de imagen del combo.
   Por ahora usamos image_url manual para avanzar rápido.

   Más adelante podemos mejorarlo con:
   - Supabase Storage
   - Preview de imagen
   - Eliminar imagen
   - Galería de imágenes para combos
========================================================= */

import Image from "next/image";
import { ImageIcon } from "lucide-react";

import type { ComboFormData } from "./types";

type ComboImageUploaderProps = {
  formData: ComboFormData;
  setFormData: React.Dispatch<React.SetStateAction<ComboFormData>>;
};

export default function ComboImageUploader({
  formData,
  setFormData,
}: ComboImageUploaderProps) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <ImageIcon size={23} />
        </div>

        <div>
          <h2 className="text-lg font-black text-[#061b3a]">
            Imagen del combo
          </h2>

          <p className="text-sm font-semibold text-slate-500">
            Agrega una imagen para mostrar el combo en la tienda.
          </p>
        </div>
      </div>

      {/* URL DE IMAGEN */}
      <label className="block">
        <span className="text-sm font-black text-[#061b3a]">
          URL de imagen
        </span>

        <input
          type="text"
          value={formData.image_url || ""}
          onChange={(e) =>
            setFormData((current) => ({
              ...current,
              image_url: e.target.value,
            }))
          }
          placeholder="/combos-banner.png o URL externa"
          className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-red-600"
        />
      </label>

      {/* PREVIEW */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
        {formData.image_url ? (
          <div className="relative h-48 w-full">
            <Image
              src={formData.image_url}
              alt="Vista previa del combo"
              fill
              unoptimized
              className="object-contain p-4"
            />
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center text-slate-400">
            <ImageIcon size={42} />
            <p className="mt-2 text-sm font-bold">
              Sin imagen seleccionada
            </p>
          </div>
        )}
      </div>
    </section>
  );
}