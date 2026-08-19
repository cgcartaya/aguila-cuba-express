"use client";

/* =========================================================
   SPACE IMAGE UPLOADER — RESERVAS ADMIN

   Mismo patrón que ComboImageUploader / MenuItemImageUploader:
   sube a Supabase Storage (bucket "product-images", carpeta
   "reservas/"), comprime con el preset "combo" (liviano, apto
   para foto de ambiente en horizontal) y guarda la URL pública
   en el formulario. Mantiene también un campo de URL manual por
   si prefieren pegar un link ya alojado en otro lado.
========================================================= */

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, Upload, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { optimizeImageFile } from "@/lib/images/optimizeImage";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export default function SpaceImageUploader({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const optimizedFile = await optimizeImageFile(file, "combo");
      const fileExt = optimizedFile.name.split(".").pop() || "webp";
      const fileName = `espacio-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `reservas/${fileName}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(filePath, optimizedFile, {
          cacheControl: "31536000",
          contentType: optimizedFile.type,
          upsert: false,
        });

      if (error) {
        console.error("Error subiendo foto del espacio:", error);
        alert("No se pudo subir la foto.");
        return;
      }

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
    } catch (err) {
      console.error("Error optimizando foto del espacio:", err);
      alert(
        err instanceof Error
          ? err.message
          : "No se pudo procesar la imagen."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div>
      <label className="text-xs font-black text-slate-600">
        Foto del ambiente
      </label>

      <div className="mt-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {value ? (
          <div className="relative h-40 w-full">
            <Image src={value} alt="" fill className="object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-1.5 text-slate-400 hover:bg-slate-100">
            {uploading ? (
              <Upload size={22} className="animate-pulse" />
            ) : (
              <ImageIcon size={22} />
            )}
            <span className="text-xs font-bold">
              {uploading ? "Subiendo..." : "Subir foto del ambiente"}
            </span>
            <span className="text-[10px] font-semibold text-slate-300">
              Se comprime automáticamente, pesa poco
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="o pega una URL de imagen"
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold outline-none focus:border-orange-300"
      />
    </div>
  );
}
