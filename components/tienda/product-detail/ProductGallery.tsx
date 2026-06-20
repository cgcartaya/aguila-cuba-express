"use client";

/* =========================================================
   IMPORTS
========================================================= */

import Image from "next/image";

/* =========================================================
   TYPES
========================================================= */

type ProductImage = {
  id: string;
  image_url: string;
  is_main: boolean;
  position: number | null;
};

type ProductGalleryProps = {
  productName: string;
  selectedImage: string;
  images: ProductImage[];
  onSelectImage: (url: string) => void;
  onOpenZoom: () => void;
};

/* =========================================================
   PRODUCT GALLERY
========================================================= */

export default function ProductGallery({
  productName,
  selectedImage,
  images,
  onSelectImage,
  onOpenZoom,
}: ProductGalleryProps) {
  return (
    <section>
      <button
        type="button"
        onClick={onOpenZoom}
        className="relative h-[360px] w-full overflow-hidden rounded-3xl bg-slate-100 md:h-[520px]"
      >
        <Image
          src={selectedImage || "/placeholder-product.png"}
          alt={productName}
          fill
          priority
          unoptimized
          className="object-contain p-4 transition duration-300 hover:scale-105"
        />

        <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black shadow-sm">
          Tocar para ampliar
        </span>
      </button>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onSelectImage(img.image_url)}
            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-100 transition ${
              selectedImage === img.image_url
                ? "border-red-600 ring-2 ring-red-100"
                : "border-slate-200"
            }`}
          >
            <Image
              src={img.image_url}
              alt={productName}
              fill
              unoptimized
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </section>
  );
}