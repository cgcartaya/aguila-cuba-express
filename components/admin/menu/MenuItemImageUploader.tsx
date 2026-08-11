"use client";

/* =========================================================
   MENU ITEM IMAGE UPLOADER
   Mismo patrón que ComboImageUploader: sube a Supabase Storage
   (bucket "product-images", carpeta "menu/") y guarda la URL
   pública en el formulario.
========================================================= */

import { useState } from "react";
import Image from "next/image";
import { ImageIcon, Upload, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { optimizeImageFile } from "@/lib/images/optimizeImage";
import type { MenuItemFormData } from "@/lib/menu/types";

type Props = {
  formData: MenuItemFormData;
  setFormData: React.Dispatch<React.SetStateAction<MenuItemFormData>>;
};

export default function MenuItemImageUploader({ formData, setFormData }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const optimizedFile = await optimizeImageFile(file, "product");
      const fileExt = optimizedFile.name.split(".").pop() || "webp";
      const fileName = `menu-${crypto.randomUUID()}.${fileExt}`;
      const filePath = `menu/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, optimizedFile, {
          cacheControl: "31536000",
          contentType: optimizedFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Error subiendo imagen del platillo:", uploadError);
        alert("No se pudo subir la imagen.");
        return;
      }

      const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-500">
        Foto del platillo
      </label>

      {formData.image_url ? (
        <div className="relative h-32 w-32 overflow-hidden rounded-2xl bg-slate-100">
          <Image src={formData.image_url} alt="" fill className="object-cover" />
          <button
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, image_url: null }))}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400">
          {uploading ? (
            <Upload size={22} className="animate-pulse" />
          ) : (
            <ImageIcon size={22} />
          )}
          <span className="text-[10px] font-bold">
            {uploading ? "Subiendo..." : "Subir foto"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}
