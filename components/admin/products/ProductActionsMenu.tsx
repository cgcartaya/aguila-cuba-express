"use client";

import { MoreVertical, Trash2, X } from "lucide-react";
import type { Product } from "./types";

type Props = {
  product: Product;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onToggleStatus: (product: Product) => void;
  onDeleteForever: (id: string) => void;
};

export default function ProductActionsMenu({
  product,
  openMenuId,
  setOpenMenuId,
  onToggleStatus,
  onDeleteForever,
}: Props) {
  const isOpen = openMenuId === product.id;

  return (
    <>
      <button
        onClick={() => setOpenMenuId(isOpen ? null : product.id)}
        className="flex w-14 items-center justify-center rounded-xl border px-3 py-2 text-slate-700"
      >
        {isOpen ? <X size={18} /> : <MoreVertical size={18} />}
      </button>

      {isOpen && (
        <div className="mt-3 rounded-xl border bg-slate-50 p-2">
          <button
            onClick={() => onToggleStatus(product)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              product.is_active
                ? "text-orange-600 hover:bg-orange-50"
                : "text-green-600 hover:bg-green-50"
            }`}
          >
            {product.is_active ? "Desactivar producto" : "Activar producto"}
          </button>

          <button
            onClick={() => onDeleteForever(product.id)}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 size={16} />
            Eliminar definitivamente
          </button>
        </div>
      )}
    </>
  );
}