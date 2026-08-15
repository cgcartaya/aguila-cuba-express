"use client";

import { Armchair, Sofa, Users } from "lucide-react";

import type { ReservationTable, SeatType } from "@/lib/reservas/types";

type PreviewTable = {
  id?: string;
  name: string;
  seat_type: SeatType;
  pos_row: number;
  pos_col: number;
};

type Props = {
  tables: ReservationTable[];
  editing: PreviewTable; // la mesa que se está creando/editando ahora mismo
};

const SEAT_TYPE_ICON: Record<SeatType, typeof Armchair> = {
  chairs: Armchair,
  sofa: Sofa,
  stools: Users,
};

export default function MiniFloorPlanPreview({ tables, editing }: Props) {
  // El resto de las mesas (sin la que se está editando, para no
  // duplicarla si ya existía) + la que se está posicionando ahora,
  // resaltada.
  const others = tables.filter((t) => t.id !== editing.id);
  const all: PreviewTable[] = [...others, editing];

  const maxRow = Math.max(...all.map((t) => t.pos_row), 0);
  const maxCol = Math.max(...all.map((t) => t.pos_col), 0);

  const grid: (PreviewTable | null)[][] = Array.from({ length: maxRow + 1 }, () =>
    Array.from({ length: maxCol + 1 }, () => null)
  );
  all.forEach((t) => {
    if (t.pos_row <= maxRow && t.pos_col <= maxCol) grid[t.pos_row][t.pos_col] = t;
  });

  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
        Vista previa del croquis
      </p>
      <div className="space-y-1.5">
        {grid.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((cell, c) => {
              const isEditing = cell && cell === editing;
              const Icon = cell ? SEAT_TYPE_ICON[cell.seat_type] : null;

              return (
                <div
                  key={c}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 text-center"
                  style={{
                    borderColor: isEditing ? "#0f172a" : cell ? "#cbd5e1" : "#f1f5f9",
                    backgroundColor: isEditing ? "#0f172a" : cell ? "#f8fafc" : "transparent",
                    borderStyle: cell ? "solid" : "dashed",
                  }}
                  title={cell?.name}
                >
                  {Icon && (
                    <Icon size={14} className={isEditing ? "text-white" : "text-slate-400"} />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] font-semibold text-slate-400">
        La casilla oscura es la mesa que estás posicionando ahora.
      </p>
    </div>
  );
}
