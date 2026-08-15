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

  // Agrupa por zona (o "Mesas" si no tiene) y ordena dentro de cada
  // zona por fila/columna — un layout que fluye y se acomoda solo,
  // en vez de un grid absoluto que deja huecos cuando hay pocas
  // mesas por fila.
  const zones = new Map<string, ReservationTable[]>();
  tables.forEach((table) => {
    const zoneName = table.zone?.trim() || "Mesas";
    const list = zones.get(zoneName) || [];
    list.push(table);
    zones.set(zoneName, list);
  });

  zones.forEach((list) => list.sort((a, b) => a.pos_row - b.pos_row || a.pos_col - b.pos_col));

  const availableCount = tables.filter((t) => !occupiedTableIds.has(t.id)).length;

  return (
    <div className="space-y-5">
      {[...zones.entries()].map(([zoneName, zoneTables]) => (
        <div key={zoneName}>
          {zones.size > 1 && (
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide opacity-50">{zoneName}</p>
          )}
          <div className="flex flex-wrap gap-2.5">
            {zoneTables.map((table) => {
              const Icon = SEAT_TYPE_ICON[table.seat_type];
              const isOccupied = occupiedTableIds.has(table.id);
              const isSelected = selectedTableId === table.id;

              return (
                <button
                  key={table.id}
                  disabled={isOccupied}
                  onClick={() => onSelect(table)}
                  className="flex w-[92px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: isSelected ? accent : isOccupied ? "#94a3b8" : `${accent}40`,
                    backgroundColor: isSelected ? `${accent}1a` : "transparent",
                  }}
                >
                  <Icon size={20} style={{ color: isOccupied ? "#94a3b8" : accent }} />
                  <span className="text-[11px] font-black leading-tight">{table.name}</span>
                  <span className="text-[10px] font-bold opacity-60">{table.capacity} pers.</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold opacity-60">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: `${accent}40` }} />
            Disponible
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full border-2"
              style={{ borderColor: accent, backgroundColor: `${accent}1a` }}
            />
            Seleccionada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-slate-400 opacity-40" />
            Ocupada
          </span>
        </div>
        <p className="text-[11px] font-bold opacity-50">
          {availableCount} de {tables.length} mesas libres
        </p>
      </div>
    </div>
  );
}
