"use client";

import { Armchair, Sofa, Users } from "lucide-react";

import type { ReservationTable, SeatType } from "@/lib/reservas/types";

type Props = {
  tables: ReservationTable[];
  occupiedTableIds: Set<string>;
  selectedTableId: string | null;
  onSelect: (table: ReservationTable) => void;
  accent: string;
};

const SEAT_TYPE_ICON: Record<SeatType, typeof Armchair> = {
  chairs: Armchair,
  sofa: Sofa,
  stools: Users,
};

export default function TableFloorPlan({
  tables,
  occupiedTableIds,
  selectedTableId,
  onSelect,
  accent,
}: Props) {
  if (tables.length === 0) {
    return (
      <p className="rounded-2xl bg-black/5 p-6 text-center text-sm font-semibold opacity-60">
        Este negocio aún no tiene mesas configuradas.
      </p>
    );
  }

  const maxCol = Math.max(...tables.map((t) => t.pos_col), 0);

  // Agrupa por fila para que cada una se dibuje como su propia
  // línea del croquis, ordenada por columna dentro de la fila.
  const rows = new Map<number, ReservationTable[]>();
  tables.forEach((table) => {
    const list = rows.get(table.pos_row) || [];
    list.push(table);
    rows.set(table.pos_row, list);
  });
  const sortedRowKeys = [...rows.keys()].sort((a, b) => a - b);

  return (
    <div className="space-y-3">
      {sortedRowKeys.map((rowKey) => {
        const rowTables = [...(rows.get(rowKey) || [])].sort((a, b) => a.pos_col - b.pos_col);
        return (
          <div
            key={rowKey}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${maxCol + 1}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: maxCol + 1 }, (_, col) => {
              const table = rowTables.find((t) => t.pos_col === col);
              if (!table) return <div key={col} />;

              const Icon = SEAT_TYPE_ICON[table.seat_type];
              const isOccupied = occupiedTableIds.has(table.id);
              const isSelected = selectedTableId === table.id;

              return (
                <button
                  key={table.id}
                  disabled={isOccupied}
                  onClick={() => onSelect(table)}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: isSelected ? accent : isOccupied ? "#94a3b8" : `${accent}55`,
                    backgroundColor: isSelected ? `${accent}1a` : "transparent",
                  }}
                >
                  <Icon size={20} style={{ color: isOccupied ? "#94a3b8" : accent }} />
                  <span className="text-[11px] font-black leading-tight">{table.name}</span>
                  <span className="text-[10px] font-bold opacity-60">
                    {table.capacity} pers.
                  </span>
                </button>
              );
            })}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] font-bold opacity-60">
        <span className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded-full border-2"
            style={{ borderColor: `${accent}55` }}
          />
          Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: accent, backgroundColor: `${accent}1a` }} />
          Seleccionada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-slate-400 opacity-40" />
          Ocupada
        </span>
      </div>
    </div>
  );
}
