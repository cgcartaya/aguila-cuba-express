"use client";

/* =========================================================
   MENU ITEM IMAGE UPLOADER
   Mismo patrón que ComboImageUploader: sube a Supabase Storage
   (bucket "product-images", carpeta "menu/") y guarda la URL
   pública en el formulario.
========================================================= */

import { useState } from "react";
import Image from "next/image";
import { Camera, ImageIcon, Trash2, Upload } from "lucide-react";

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
    <div className="space-y-3">
      {formData.image_url ? (
        <>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100">
          <Image src={formData.image_url} alt="Foto del platillo" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          <label className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-[#061b3a]/95 px-4 py-2.5 text-xs font-black text-white shadow-lg transition hover:bg-[#0b2b58]">
            {uploading ? <Upload size={15} className="animate-pulse" /> : <Camera size={15} />}
            {uploading ? "Subiendo..." : "Cambiar foto"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
          <button
            type="button"
            onClick={() => setFormData((prev) => ({ ...prev, image_url: null }))}
            className="mx-auto flex items-center gap-1.5 text-xs font-extrabold text-red-500 transition hover:text-red-600"
          >
            <Trash2 size={14} /> Eliminar foto
          </button>
        </>
      ) : (
        <label className="flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-600">
          {uploading ? (
            <Upload size={22} className="animate-pulse" />
          ) : (
            <ImageIcon size={22} />
          )}
          <span className="text-xs font-extrabold">
            {uploading ? "Subiendo..." : "Subir foto"}
          </span>
          <span className="text-[10px] font-semibold text-slate-400">Formato recomendado 4:3</span>
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
