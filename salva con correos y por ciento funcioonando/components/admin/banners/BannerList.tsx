"use client";

import { GripVertical } from "lucide-react";

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
    value: string | number | boolean | null
  ) => void;

  onDelete: (id: string) => void;

  onCategoryChange: (
    bannerId: string,
    categoryId: string
  ) => void;

  onReorder: (banners: Banner[]) => void;
};

export default function BannerList({
  banners,
  categories,
  onUpdate,
  onDelete,
  onCategoryChange,
  onReorder,
}: Props) {
  if (banners.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-5 text-center text-slate-500">
        No hay banners creados.
      </div>
    );
  }

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    index: number
  ) => {
    event.dataTransfer.setData("bannerIndex", String(index));
  };

  const handleDrop = (
    event: React.DragEvent<HTMLDivElement>,
    dropIndex: number
  ) => {
    event.preventDefault();

    const draggedIndex = Number(
      event.dataTransfer.getData("bannerIndex")
    );

    if (draggedIndex === dropIndex) return;

    const reordered = [...banners];
    const [movedBanner] = reordered.splice(draggedIndex, 1);

    reordered.splice(dropIndex, 0, movedBanner);

    onReorder(reordered);
  };

  return (
    <div className="space-y-5">
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          draggable
          onDragStart={(event) =>
            handleDragStart(event, index)
          }
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop(event, index)}
          className="rounded-3xl border border-transparent transition hover:border-blue-200"
        >
          <div className="mb-2 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-sm font-black text-slate-500">
            <GripVertical size={18} />
            Arrastra para cambiar el orden
          </div>

          <BannerCard
            banner={banner}
            categories={categories}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onCategoryChange={onCategoryChange}
          />
        </div>
      ))}
    </div>
  );
}