"use client";

import { Trash2 } from "lucide-react";

import AdminInput from "@/components/admin/ui/AdminInput";
import BannerPreview from "./BannerPreview";
import BannerImageUploader from "./BannerImageUploader";

import type { Banner, Category } from "@/components/admin/settings/types";
import { getSelectedCategoryFromLink } from "./bannerHelpers";

type Props = {
  banner: Banner;
  categories: Category[];

  onUpdate: (
    id: string,
    field: keyof Banner,
    value: string | number | boolean | null
  ) => void;

  onDelete: (id: string) => void;

  onCategoryChange: (bannerId: string, categoryId: string) => void;
};

export default function BannerCard({
  banner,
  categories,
  onUpdate,
  onDelete,
  onCategoryChange,
}: Props) {
  const selectedCategoryId =
    banner.category_id ||
    getSelectedCategoryFromLink(categories, banner.button_link) ||
    "";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <BannerPreview imageUrl={banner.image_url} title={banner.title} />

      <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AdminInput
          label="Título"
          value={banner.title}
          onChange={(value) => onUpdate(banner.id, "title", value)}
        />

        <AdminInput
          label="Subtítulo"
          value={banner.subtitle || ""}
          onChange={(value) => onUpdate(banner.id, "subtitle", value)}
        />

        <AdminInput
          label="Texto botón"
          value={banner.button_text || ""}
          onChange={(value) => onUpdate(banner.id, "button_text", value)}
        />

        <AdminInput
          label="Orden"
          type="number"
          value={String(banner.sort_order)}
          onChange={(value) =>
            onUpdate(banner.id, "sort_order", Number(value))
          }
        />

        <div>
          <label className="mb-2 block text-sm font-bold">
            Categoría destino
          </label>

          <select
            value={selectedCategoryId}
            onChange={(e) => onCategoryChange(banner.id, e.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 px-4"
          >
            <option value="">Tienda completa</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs font-semibold text-slate-500">
            {banner.button_link || "/tienda"}
          </p>
        </div>

        <BannerImageUploader
          label="Cambiar imagen"
          onUploaded={(url) => onUpdate(banner.id, "image_url", url)}
        />
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => onUpdate(banner.id, "is_active", !banner.is_active)}
          className={`rounded-2xl px-5 py-3 font-bold ${
            banner.is_active
              ? "bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {banner.is_active ? "Activo" : "Inactivo"}
        </button>

        <button
          type="button"
          onClick={() => onDelete(banner.id)}
          className="inline-flex items-center gap-2 rounded-2xl bg-red-50 px-5 py-3 font-bold text-red-600"
        >
          <Trash2 size={18} />
          Eliminar
        </button>
      </div>
    </div>
  );
}