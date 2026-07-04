"use client";

/* =========================================================
   COMBO IMAGE UPLOADER - COMBOS ADMIN

   Permite:
   - Subir imagen local desde la PC
   - Guardarla en Supabase Storage
   - Guardar la URL pública en formData.image_url
   - Mostrar preview
========================================================= */

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, Upload, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { ComboFormData } from "./types";

type ComboImageUploaderProps = {
  formData: ComboFormData;
  setFormData: React.Dispatch<React.SetStateAction<ComboFormData>>;
};

export default function ComboImageUploader({
  formData,
  setFormData,
}: ComboImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  /* =========================================================
     SUBIR IMAGEN A SUPABASE STORAGE
  ========================================================= */

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    try {
      setUploading(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `combo-${Date.now()}.${fileExt}`;
      const filePath = `combos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error subiendo imagen del combo:", uploadError);
        alert("No se pudo subir la imagen del combo.");
        return;
      }

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      setFormData((current) => ({
        ...current,
        image_url: data.publicUrl,
      }));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  /* =========================================================
     ELIMINAR IMAGEN DEL FORMULARIO

     Nota:
     Esto solo limpia la imagen del formulario.
     No elimina todavía el archivo del Storage.
  ========================================================= */

  const clearImage = () => {
    setFormData((current) => ({
      ...current,
      image_url: "",
    }));
  };

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
            Sube una imagen para mostrar el combo en la tienda.
          </p>
        </div>
      </div>

      {/* BOTÓN DE SUBIDA */}
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-black text-[#061b3a] transition hover:bg-slate-100">
        <Upload size={18} />
        {uploading ? "Subiendo imagen..." : "Subir imagen"}

        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {/* URL MANUAL OPCIONAL */}
      <label className="mt-4 block">
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
              sizes="(max-width: 768px) 100vw, 480px"
              className="object-contain p-4"
            />

            <button
              type="button"
              onClick={clearImage}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-red-600 shadow-sm"
            >
              <X size={18} />
            </button>
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