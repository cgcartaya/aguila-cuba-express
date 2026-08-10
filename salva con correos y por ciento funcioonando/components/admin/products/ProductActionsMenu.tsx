"use client";

import { Loader2, MoreVertical, Trash2, X } from "lucide-react";
import type { Product } from "./types";

type Props = {
  product: Product;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onToggleStatus: (product: Product) => void;
  onMoveToTrash: (id: string) => void;
  disabled?: boolean;
};

export default function ProductActionsMenu({
  product,
  openMenuId,
  setOpenMenuId,
  onToggleStatus,
  onMoveToTrash,
  disabled = false,
}: Props) {
  const isOpen = openMenuId === product.id;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenMenuId(isOpen ? null : product.id)}
        disabled={disabled}
        className="flex w-14 items-center justify-center rounded-xl border px-3 py-2 text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {disabled ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isOpen ? (
          <X size={18} />
        ) : (
          <MoreVertical size={18} />
        )}
      </button>

      {isOpen && (
        <div className="mt-3 rounded-xl border bg-slate-50 p-2">
          <button
            type="button"
            onClick={() => onToggleStatus(product)}
            disabled={disabled}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${
              product.is_active
                ? "text-orange-600 hover:bg-orange-50"
                : "text-green-600 hover:bg-green-50"
            }`}
          >
            {product.is_active ? "Desactivar producto" : "Activar producto"}
          </button>

          <button
            type="button"
            onClick={() => onMoveToTrash(product.id)}
            disabled={disabled}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {disabled ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Mover a papelera
          </button>
        </div>
      )}
    </>
  );
}
