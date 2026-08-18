"use client";

import {
  Armchair,
  Building2,
  MapPin,
  Sofa,
  Users,
} from "lucide-react";

import {
  SPACE_TYPE_LABEL,
  type ReservationSpace,
  type ReservationTable,
  type SeatType,
} from "@/lib/reservas/types";

type Props = {
  spaces?: ReservationSpace[];
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
  spaces = [],
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

  const activeSpaces = spaces.filter((space) =>
    tables.some((table) => table.space_id === space.id)
  );

  const fallbackTables = tables.filter(
    (table) => !table.space_id || !spaces.some((space) => space.id === table.space_id)
  );

  const groups = [
    ...activeSpaces.map((space) => ({
      id: space.id,
      name: space.name,
      description: space.description,
      image_url: space.image_url,
      floor_label: space.floor_label,
      typeLabel: SPACE_TYPE_LABEL[space.space_type],
      tables: tables
        .filter((table) => table.space_id === space.id)
        .sort((a,b)=>a.pos_row-b.pos_row || a.pos_col-b.pos_col),
    })),
    ...(fallbackTables.length
      ? [{
          id: "fallback",
          name: "Otras mesas",
          description: null,
          image_url: null,
          floor_label: null,
          typeLabel: "Sin espacio asignado",
          tables: fallbackTables,
        }]
      : []),
  ];

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.id} className="overflow-hidden rounded-2xl border border-[#E7DED2] bg-white">
          <div className="grid sm:grid-cols-[170px_minmax(0,1fr)]">
            <div className="relative min-h-[120px] bg-[#F4EEE6]">
              {group.image_url ? (
                <img src={group.image_url} alt={group.name} className="absolute inset-0 h-full w-full object-cover"/>
              ) : (
                <div className="flex h-full min-h-[120px] items-center justify-center text-black/15"><Building2 size={32}/></div>
              )}
            </div>

            <div className="p-4">
              <p className="text-[9px] font-black uppercase tracking-[.16em]" style={{color:accent}}>
                {group.typeLabel}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h3 className="text-base font-black text-[#1B1410]">{group.name}</h3>
                {group.floor_label && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/[.05] px-2 py-1 text-[9px] font-black text-black/45">
                    <MapPin size={9}/>{group.floor_label}
                  </span>
                )}
              </div>
              {group.description && (
                <p className="mt-1 text-xs font-semibold leading-5 text-black/45">{group.description}</p>
              )}
            </div>
          </div>

          <div className="border-t border-[#EEE5DA] bg-[#FCF9F4] p-4">
            <div className="flex flex-wrap gap-2.5">
              {group.tables.map((table) => {
                const Icon = SEAT_TYPE_ICON[table.seat_type];
                const isOccupied = occupiedTableIds.has(table.id);
                const isSelected = selectedTableId === table.id;

                return (
                  <button
                    key={table.id}
                    disabled={isOccupied}
                    onClick={() => onSelect(table)}
                    className="flex w-[104px] flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-white px-2 py-3 text-center transition disabled:cursor-not-allowed disabled:opacity-35"
                    style={{
                      borderColor: isSelected
                        ? accent
                        : isOccupied
                        ? "#94a3b8"
                        : "#E1D6C8",
                      backgroundColor: isSelected ? `${accent}12` : "#fff",
                    }}
                  >
                    <Icon size={20} style={{color:isOccupied?"#94a3b8":accent}}/>
                    <span className="text-[11px] font-black leading-tight">{table.name}</span>
                    <span className="text-[10px] font-bold opacity-50">{table.capacity} pers.</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
