"use client";

import BannerCard from "./BannerCard";

import type {
  Banner,
  Category,
} from "@/components/admin/settings/types";

type Props = {
  banners: Banner[];
  categories: Category[];

  onUpdate: (
    id: string,
    field: keyof Banner,
    value: string | number | boolean
  ) => void;

  onDelete: (id: string) => void;

  onCategoryChange: (
    bannerId: string,
    categoryId: string
  ) => void;
};

export default function BannerList({
  banners,
  categories,
  onUpdate,
  onDelete,
  onCategoryChange,
}: Props) {
  if (banners.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-center text-slate-500">
        No hay banners creados.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {banners.map((banner) => (
        <BannerCard
          key={banner.id}
          banner={banner}
          categories={categories}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCategoryChange={onCategoryChange}
        />
      ))}
    </div>
  );
}