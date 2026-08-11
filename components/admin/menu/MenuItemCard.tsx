"use client";

import Link from "next/link";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";

import type { MenuItem } from "@/lib/menu/types";

type Props = {
  item: MenuItem;
  onDelete: (id: string) => void;
};

export default function MenuItemCard({ item, onDelete }: Props) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-black text-slate-900">{item.name}</p>
          {!item.is_active && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
              Oculto
            </span>
          )}
        </div>
        <p className="truncate text-xs font-semibold text-slate-500">
          {item.description || "Sin descripción"}
        </p>
        {item.menu_item_option_groups.length > 0 && (
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            {item.menu_item_option_groups.map((g) => g.name).join(" · ")}
          </p>
        )}
      </div>

      <p className="shrink-0 text-sm font-black text-slate-900">${item.price.toFixed(2)}</p>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/admin/menu/items/${item.id}`}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <Pencil size={16} />
        </Link>
        <button
          onClick={() => onDelete(item.id)}
          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={16} />
        </button>
        <span className="rounded-lg p-2 text-slate-300">
          {item.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
        </span>
      </div>
    </div>
  );
}
