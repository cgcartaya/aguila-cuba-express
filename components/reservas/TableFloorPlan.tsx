"use client";

import {
  Armchair,
  DoorOpen,
  LayoutPanelTop,
  Square,
  TreePine,
  Type,
  Wind,
} from "lucide-react";

import type {
  ReservationSpace,
  ReservationSpaceElement,
  ReservationTable,
} from "@/lib/reservas/types";

type Props = {
  spaces?: ReservationSpace[];
  elements?: ReservationSpaceElement[];
  tables: ReservationTable[];
  occupiedTableIds: Set<string>;
  selectedTableId: string | null;
  onSelect: (table: ReservationTable) => void;
  accent: string;
};

const ICONS = {
  wall: Square,
  door: DoorOpen,
  window: Wind,
  bar: LayoutPanelTop,
  entrance: DoorOpen,
  plant: TreePine,
  label: Type,
};

export default function TableFloorPlan({
  spaces = [],
  elements = [],
  tables,
  occupiedTableIds,
  selectedTableId,
  onSelect,
  accent,
}: Props) {
  const activeSpaces = spaces.filter((space) =>
    tables.some((table) => table.space_id === space.id)
  );

  if (tables.length === 0) {
    return (
      <p className="rounded-2xl bg-black/5 p-6 text-center text-sm font-semibold opacity-60">
        Este negocio aún no tiene mesas configuradas.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {activeSpaces.map((space) => {
        const spaceTables = tables.filter((table) => table.space_id === space.id);
        const spaceElements = elements.filter((element) => element.space_id === space.id);

        return (
          <section
            key={space.id}
            className="overflow-hidden rounded-2xl border border-[#E7DED2] bg-white"
          >
            <div className="border-b border-[#EEE5DA] p-4">
              <p className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: accent }}>
                {space.floor_label || "Espacio"}
              </p>
              <h3 className="mt-1 text-base font-black text-[#1B1410]">
                {space.name}
              </h3>
              {space.description && (
                <p className="mt-1 text-xs font-semibold leading-5 text-black/45">
                  {space.description}
                </p>
              )}
            </div>

            <div className="p-3 sm:p-4">
              <div
                className="relative aspect-[16/9] min-h-[310px] overflow-hidden rounded-2xl border border-[#E7DED2] bg-[#F8F3EC]"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(27,20,16,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(27,20,16,.035) 1px,transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              >
                {space.image_url && (
                  <img
                    src={space.image_url}
                    alt=""
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.07]"
                  />
                )}

                {spaceElements.map((element) => {
                  const Icon = ICONS[element.element_type];
                  return (
                    <div
                      key={element.id}
                      className="absolute flex items-center justify-center rounded border border-black/10 bg-white/80"
                      style={{
                        left: `${element.pos_x}%`,
                        top: `${element.pos_y}%`,
                        width: `${element.width}%`,
                        height: `${element.height}%`,
                        transform: `translate(-50%,-50%) rotate(${element.rotation}deg)`,
                      }}
                    >
                      <Icon size={11} className="text-black/35" />
                      {element.element_type === "label" && (
                        <span className="ml-1 text-[8px] font-black text-black/40">
                          {element.label}
                        </span>
                      )}
                    </div>
                  );
                })}

                {spaceTables.map((table) => {
                  const occupied = occupiedTableIds.has(table.id);
                  const selected = selectedTableId === table.id;

                  return (
                    <button
                      key={table.id}
                      type="button"
                      disabled={occupied}
                      onClick={() => onSelect(table)}
                      className={`absolute flex flex-col items-center justify-center border-2 bg-white text-center shadow-sm transition disabled:cursor-not-allowed disabled:opacity-35 ${
                        table.table_shape === "round"
                          ? "h-14 w-14 rounded-full sm:h-16 sm:w-16"
                          : table.table_shape === "rect"
                          ? "h-12 w-20 rounded-xl sm:h-14 sm:w-24"
                          : "h-14 w-14 rounded-xl sm:h-16 sm:w-16"
                      }`}
                      style={{
                        left: `${table.pos_x ?? 50}%`,
                        top: `${table.pos_y ?? 50}%`,
                        transform: `translate(-50%,-50%) rotate(${table.rotation || 0}deg)`,
                        borderColor: selected
                          ? accent
                          : occupied
                          ? "#94a3b8"
                          : "#E1D6C8",
                        backgroundColor: selected ? `${accent}12` : "#fff",
                      }}
                    >
                      <Armchair
                        size={14}
                        style={{ color: occupied ? "#94a3b8" : accent }}
                      />
                      <span className="mt-0.5 max-w-[70px] truncate text-[8px] font-black text-[#1B1410] sm:text-[9px]">
                        {table.name}
                      </span>
                      <span className="text-[7px] font-bold text-black/35">
                        {table.capacity} pers.
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
