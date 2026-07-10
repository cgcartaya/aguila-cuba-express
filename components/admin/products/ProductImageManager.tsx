"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  X,
} from "lucide-react";

import type { ProductImage } from "./types";

import {
  getProductImages,
  uploadProductImage,
  deleteProductImage,
  setMainProductImage,
} from "@/lib/services/products";

type Props = {
  productId: string;
};

export default function ProductImageManager({ productId }: Props) {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingMainId, setSettingMainId] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<ProductImage | null>(null);

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function fetchImages() {
    setLoading(true);

    const { data, error } = await getProductImages(productId);

    if (error) {
      console.error("Error cargando imágenes:", error.message);
      setImages([]);
    } else {
      setImages((data || []) as ProductImage[]);
    }

    setLoading(false);
  }

  async function handleUpload(files: FileList) {
    if (!files.length || uploading) return;

    setUploading(true);

    const filesArray = Array.from(files);
    const hasMainImage = images.some((img) => img.is_main);
    const uploadedImages: ProductImage[] = [];

    for (let index = 0; index < filesArray.length; index++) {
      const file = filesArray[index];
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
        uploadedImages.push(data as ProductImage);
      }
    }

    if (uploadedImages.length > 0) {
      setImages((prev) => [...prev, ...uploadedImages]);
    }

    setUploading(false);
  }

  async function handleSetMain(image: ProductImage) {
    if (image.is_main || settingMainId) return;

    setSettingMainId(image.id);

    const { error } = await setMainProductImage(productId, image.id);

    if (error) {
      alert("Error marcando imagen principal");
      setSettingMainId(null);
      return;
    }

    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        is_main: img.id === image.id,
      }))
    );

    setSettingMainId(null);
  }

  async function confirmDeleteImage() {
    if (!imageToDelete || deletingId) return;

    setDeletingId(imageToDelete.id);

    const { error } = await deleteProductImage(imageToDelete);

    if (error) {
      alert("Error eliminando imagen");
      setDeletingId(null);
      return;
    }

    setImages((prev) => prev.filter((img) => img.id !== imageToDelete.id));
    setDeletingId(null);
    setImageToDelete(null);
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            Imágenes del producto
          </h2>

          <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-slate-500">
            Sube una o varias imágenes. La primera se marcará como principal si
            el producto no tiene ninguna.
          </p>
        </div>

        <div className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
          {images.length} {images.length === 1 ? "imagen" : "imágenes"}
        </div>
      </div>

      <label className="mb-5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center text-sm font-bold text-slate-700 transition hover:bg-slate-100">
        {uploading ? (
          <Loader2 size={28} className="animate-spin text-slate-600" />
        ) : (
          <ImagePlus size={28} className="text-slate-600" />
        )}

        <span>{uploading ? "Subiendo imágenes..." : "Subir imágenes"}</span>

        <span className="text-xs font-medium text-slate-500">
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

      {loading ? (
        <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
          Cargando imágenes...
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
          Este producto todavía no tiene imágenes.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => {
            const isDeleting = deletingId === image.id;
            const isSettingMain = settingMainId === image.id;

            return (
              <article
                key={image.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="aspect-[4/3] bg-slate-100 sm:aspect-square">
  <img
    src={image.image_url}
    alt="Imagen del producto"
    className="h-full w-full object-cover"
    loading="lazy"
    onError={(e) => {
      e.currentTarget.src = "/placeholder-product.png";
    }}
  />

                  {image.is_main && (
                    <span className="absolute left-3 top-3 rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700 shadow-sm">
                      Principal
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleSetMain(image)}
                    disabled={image.is_main || isSettingMain || Boolean(settingMainId)}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSettingMain ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Star size={16} />
                    )}
                    Principal
                  </button>

                  <button
                    type="button"
                    onClick={() => setImageToDelete(image)}
                    disabled={isDeleting}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    Eliminar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {imageToDelete && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <AlertTriangle size={22} />
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    ¿Eliminar imagen?
                  </h3>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setImageToDelete(null)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="relative mb-5 aspect-video overflow-hidden rounded-2xl bg-slate-100">
              <Image
                src={imageToDelete.image_url}
                alt="Imagen a eliminar"
                fill
                sizes="400px"
                className="object-cover"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setImageToDelete(null)}
                disabled={Boolean(deletingId)}
                className="rounded-2xl border px-5 py-3 text-center font-black text-slate-700 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmDeleteImage}
                disabled={Boolean(deletingId)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-black text-white disabled:opacity-60"
              >
                {deletingId ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
