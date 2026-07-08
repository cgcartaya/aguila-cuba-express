"use client";

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

export default function ProductGallery({
  productName,
  selectedImage,
  images,
  onSelectImage,
  onOpenZoom,
}: ProductGalleryProps) {
  const safeSelectedImage =
    selectedImage?.trim() || "/placeholder-product.png";

  return (
    <section>
      <button
        type="button"
        onClick={onOpenZoom}
        className="relative flex h-[360px] w-full items-center justify-center overflow-hidden rounded-3xl bg-slate-100 md:h-[520px]"
      >
        <img
          src={safeSelectedImage}
          alt={productName}
          className="h-full w-full object-contain p-4 transition duration-300 hover:scale-105"
          loading="eager"
          onError={(event) => {
            event.currentTarget.src = "/placeholder-product.png";
          }}
        />

        <span className="absolute bottom-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black shadow-sm">
          Tocar para ampliar
        </span>
      </button>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {images.map((img) => {
          const imageUrl = img.image_url?.trim() || "/placeholder-product.png";

          return (
            <button
              key={img.id}
              type="button"
              onClick={() => onSelectImage(imageUrl)}
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 bg-slate-100 transition ${
                safeSelectedImage === imageUrl
                  ? "border-red-600 ring-2 ring-red-100"
                  : "border-slate-200"
              }`}
            >
              <img
                src={imageUrl}
                alt={productName}
                className="h-full w-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.src = "/placeholder-product.png";
                }}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}