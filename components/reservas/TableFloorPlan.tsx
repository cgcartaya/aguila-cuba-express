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

function SeatDots({
  capacity,
  occupied,
  accent,
}: {
  capacity: number;
  occupied: boolean;
  accent: string;
}) {
  const shown = Math.min(Math.max(capacity, 1), 8);

  return (
    <>
      {Array.from({ length: shown }).map((_, index) => {
        const angle = (Math.PI * 2 * index) / shown - Math.PI / 2;
        const x = 50 + Math.cos(angle) * 48;
        const y = 50 + Math.sin(angle) * 48;

        return (
          <span
            key={index}
            className="absolute h-2.5 w-2.5 rounded-full border bg-white shadow-sm"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%,-50%)",
              borderColor: occupied ? "#94a3b8" : accent,
            }}
          />
        );
      })}
    </>
  );
}

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
        const spaceTables = tables.filter(
          (table) => table.space_id === space.id
        );
        const spaceElements = elements.filter(
          (element) => element.space_id === space.id
        );

        return (
          <section
            key={space.id}
            className="overflow-hidden rounded-2xl border border-[#E7DED2] bg-white"
          >
            <div className="border-b border-[#EEE5DA] p-4">
              <p
                className="text-[10px] font-black uppercase tracking-[.14em]"
                style={{ color: accent }}
              >
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

                      {(element.element_type === "label" ||
                        element.element_type === "bar" ||
                        element.element_type === "entrance") && (
                        <span className="ml-1 truncate text-[8px] font-black text-black/40">
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
                      className={`absolute flex items-center justify-center bg-white text-center shadow-sm transition disabled:cursor-not-allowed disabled:opacity-35 ${
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
                        border: `2px solid ${
                          selected
                            ? accent
                            : occupied
                            ? "#94a3b8"
                            : "#E1D6C8"
                        }`,
                        backgroundColor: selected ? `${accent}12` : "#fff",
                      }}
                    >
                      <SeatDots
                        capacity={table.capacity}
                        occupied={occupied}
                        accent={accent}
                      />

                      <div className="relative z-10 rounded-lg bg-white/90 px-1.5 py-1">
                        <Armchair
                          size={13}
                          className="mx-auto"
                          style={{
                            color: occupied ? "#94a3b8" : accent,
                          }}
                        />

                        <span className="mt-0.5 block max-w-[70px] truncate text-[8px] font-black text-[#1B1410] sm:text-[9px]">
                          {table.name}
                        </span>

                        <span
                          className="block text-[7px] font-black sm:text-[8px]"
                          style={{
                            color: occupied ? "#94a3b8" : accent,
                          }}
                        >
                          {table.capacity} personas
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-[9px] font-black text-black/40">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full border border-emerald-500 bg-white" />
                  Disponible
                </span>

                <span className="inline-flex items-center gap-1">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  Seleccionada
                </span>

                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  Ocupada
                </span>

                <span className="ml-auto">
                  Los puntos alrededor representan la cantidad de asientos.
                </span>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
