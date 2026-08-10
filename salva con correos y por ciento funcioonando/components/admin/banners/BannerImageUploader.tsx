"use client";

/* =========================================================
   BANNER IMAGE UPLOADER

   Componente reutilizable para subir imágenes de banners
   a Supabase Storage.
========================================================= */

import { useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { BANNER_BUCKET } from "./bannerHelpers";
import { optimizeImageFile } from "@/lib/images/optimizeImage";

type BannerImageUploaderProps = {
  label?: string;
  onUploaded: (publicUrl: string) => void | Promise<void>;
  disabled?: boolean;
};

export default function BannerImageUploader({
  label = "Elegir banner",
  onUploaded,
  disabled = false,
}: BannerImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const uploadBannerImage = async (file: File) => {
    const optimizedFile = await optimizeImageFile(file, "banner");
    const fileExt = optimizedFile.name.split(".").pop() || "webp";
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BANNER_BUCKET)
      .upload(filePath, optimizedFile, {
        cacheControl: "31536000",
        contentType: optimizedFile.type,
        upsert: false,
      });

    if (uploadError) {
      alert(
        "No se pudo subir la imagen. Revisa que exista el bucket banner-images en Supabase Storage."
      );

      return null;
    }

    const { data } = supabase.storage
      .from(BANNER_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    let publicUrl: string | null = null;
    try {
      publicUrl = await uploadBannerImage(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo optimizar el banner.");
    }

    if (publicUrl) {
      await onUploaded(publicUrl);
    }

    setUploading(false);
    event.target.value = "";
  };

  return (
    <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-blue-50 px-4 text-sm font-black text-blue-700 transition hover:bg-blue-100">
      {uploading ? (
        <>
          <Loader2 className="animate-spin" size={18} />
          Subiendo imagen...
        </>
      ) : (
        <>
          <UploadCloud size={18} />
          {label}
        </>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading || disabled}
        className="hidden"
      />
    </label>
  );
}