"use client";

/* =========================================================
   BANNER PREVIEW

   Vista previa reutilizable para banners.
========================================================= */

import { Eye } from "lucide-react";

type BannerPreviewProps = {
  imageUrl?: string | null;
  title?: string;
};

export default function BannerPreview({
  imageUrl,
  title = "Vista previa del banner",
}: BannerPreviewProps) {
  if (!imageUrl) {
    return (
      <div className="flex h-44 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-400 md:h-56">
        Sin imagen
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#061b3a]">
        <Eye size={18} />
        {title}
      </div>

      <img
        src={imageUrl}
        alt={title}
        className="h-44 w-full object-cover md:h-64"
      />
    </div>
  );
}