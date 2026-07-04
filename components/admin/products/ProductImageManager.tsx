"use client";

/* ==========================
   IMPORTS
========================== */

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImagePlus, Star, Trash2, Loader2 } from "lucide-react";

import type { ProductImage } from "./types";

import {
  getProductImages,
  uploadProductImage,
  deleteProductImage,
  setMainProductImage,
} from "@/lib/services/products";

/* ==========================
   PROPS
========================== */

type Props = {
  productId: string;
};

/* ==========================
   PRODUCT IMAGE MANAGER
========================== */

export default function ProductImageManager({ productId }: Props) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  /* ==========================
     CARGA INICIAL
  ========================== */

  useEffect(() => {
    fetchImages();
  }, [productId]);

  async function fetchImages() {
    setLoading(true);

    const { data, error } = await getProductImages(productId);

    if (error) {
      console.error("Error cargando imágenes:", error.message);
      setImages([]);
    } else {
      setImages(data || []);
    }

    setLoading(false);
  }

  /* ==========================
     SUBIR UNA O VARIAS IMÁGENES
  ========================== */

  async function handleUpload(files: FileList) {
    if (!files.length) return;

    setUploading(true);

    const filesArray = Array.from(files);
    const hasMainImage = images.some((img) => img.is_main);

    const uploadedImages: ProductImage[] = [];

    for (let index = 0; index < filesArray.length; index++) {
      const file = filesArray[index];

      /*
        Si el producto no tiene imagen principal todavía,
        la primera imagen seleccionada se marca automáticamente como principal.
      */

      const shouldBeMain = !hasMainImage && index === 0;

      const { data, error } = await uploadProductImage(
        productId,
        file,
        shouldBeMain,
        images.length + index
      );

      if (error) {
        console.error("Error subiendo imagen:", error.message);
        alert(`Error subiendo la imagen: ${file.name}`);
        continue;
      }

      if (data) {
        uploadedImages.push(data);
      }
    }

    if (uploadedImages.length > 0) {
      setImages((prev) => [...prev, ...uploadedImages]);
    }

    setUploading(false);
  }

  /* ==========================
     MARCAR IMAGEN PRINCIPAL
  ========================== */

  async function handleSetMain(image: ProductImage) {
    const { error } = await setMainProductImage(productId, image.id);

    if (error) {
      alert("Error marcando imagen principal");
      return;
    }

    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        is_main: img.id === image.id,
      }))
    );
  }

  /* ==========================
     ELIMINAR IMAGEN
  ========================== */

  async function handleDelete(image: ProductImage) {
    const confirmed = confirm("¿Seguro que quieres eliminar esta imagen?");
    if (!confirmed) return;

    const { error } = await deleteProductImage(image);

    if (error) {
      alert("Error eliminando imagen");
      return;
    }

    setImages((prev) => prev.filter((img) => img.id !== image.id));
  }

  /* ==========================
     RENDER
  ========================== */

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900">
          Imágenes del producto
        </h2>

        <p className="text-sm text-slate-500">
          Sube una o varias imágenes. La primera se marcará como principal si el
          producto no tiene ninguna.
        </p>
      </div>

      {/* SUBIDA DE IMÁGENES */}

      <label className="mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
        {uploading ? (
          <Loader2 size={24} className="animate-spin text-slate-600" />
        ) : (
          <ImagePlus size={24} className="text-slate-600" />
        )}

        <span>
          {uploading ? "Subiendo imágenes..." : "Subir imágenes"}
        </span>

        <span className="text-xs font-normal text-slate-500">
          Puedes seleccionar una o varias fotos
        </span>

        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const files = e.target.files;
            if (!files) return;

            handleUpload(files);
            e.target.value = "";
          }}
        />
      </label>

      {/* LISTADO DE IMÁGENES */}

      {loading ? (
        <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
          Cargando imágenes...
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
          Este producto todavía no tiene imágenes.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="overflow-hidden rounded-xl border bg-white"
            >
              <div className="relative aspect-square bg-slate-100">
<Image
  src={image.image_url}
  alt="Imagen del producto"
  fill
  sizes="(max-width: 768px) 50vw, 220px"
  className="object-cover"
/>

                {image.is_main && (
                  <span className="absolute left-2 top-2 rounded-full bg-yellow-100 px-2 py-1 text-xs font-bold text-yellow-700">
                    Principal
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 p-2">
                <button
                  type="button"
                  onClick={() => handleSetMain(image)}
                  disabled={image.is_main}
                  className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Star size={14} />
                  Principal
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(image)}
                  className="flex items-center justify-center gap-1 rounded-lg bg-red-50 px-2 py-2 text-xs font-semibold text-red-600"
                >
                  <Trash2 size={14} />
                  Borrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}