"use client";

import { useState } from "react";
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { optimizeImageFile } from "@/lib/images/optimizeImage";

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export default function ImageUpload({
  value,
  onChange,
}: Props) {
  const [loading, setLoading] = useState(false);

  const uploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    try {
      setLoading(true);

      const optimizedFile = await optimizeImageFile(file, "product");
      const extension = optimizedFile.name.split(".").pop() || "webp";
      const fileName = `${crypto.randomUUID()}.${extension}`;

      const { error } = await supabase.storage
        .from("products")
        .upload(fileName, optimizedFile, {
          cacheControl: "31536000",
          contentType: optimizedFile.type,
          upsert: false,
        });

      if (error) throw error;


      const { data } = supabase.storage
        .from("products")
        .getPublicUrl(fileName);


      onChange(data.publicUrl);

    } catch (error) {
      console.error(error);
      alert("Error subiendo imagen");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-gray-700">
        Imagen del producto
      </label>


      <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center hover:bg-gray-50">

        {loading ? (
          <>
            <Loader2
              className="mb-3 animate-spin"
              size={32}
            />
            <p>Subiendo imagen...</p>
          </>
        ) : value ? (
          <>
            <img
              src={value}
              alt="Producto"
              className="mb-3 h-32 w-32 rounded-2xl object-cover"
            />

            <p className="text-sm text-gray-500">
              Toca para cambiar imagen
            </p>
          </>
        ) : (
          <>
            <Upload
              size={32}
              className="mb-3"
            />

            <p className="font-semibold">
              Subir imagen
            </p>

            <p className="text-sm text-gray-500">
              JPG, PNG o WEBP · Compresión automática
            </p>
          </>
        )}


        <input
          type="file"
          accept="image/*"
          onChange={uploadImage}
          className="hidden"
        />

      </label>
    </div>
  );
}