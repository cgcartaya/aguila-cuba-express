"use client";

import {
  Armchair,
  DoorOpen,
  LayoutPanelTop,
  MapPin,
  Square,
  TreePine,
  Toilet,
  Footprints,
  Type,
  Wind
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
  restroom: Toilet,
  stool: Armchair,
  stairs: Footprints,
  label: Type,
};

function seatPositions(capacity: number) {
  const shown = Math.min(Math.max(capacity, 1), 10);

  return Array.from({ length: shown }).map((_, index) => {
    const angle = (Math.PI * 2 * index) / shown - Math.PI / 2;
    return {
      x: 50 + Math.cos(angle) * 54,
      y: 50 + Math.sin(angle) * 54,
    };
  });
}

function SeatDots({
  capacity,
  state,
  accent,
}: {
  capacity: number;
  state: "available" | "selected" | "occupied";
  accent: string;
}) {
  const positions = seatPositions(capacity);
  const border =
    state === "selected"
      ? accent
      : state === "occupied"
      ? "#ef4444"
      : "#65a30d";

  const bg =
    state === "selected"
      ? "#fff7ed"
      : state === "occupied"
      ? "#fee2e2"
      : "#ecfccb";

  return (
    <>
      {positions.map((position, index) => (
        <span
          key={index}
          className="absolute h-3 w-3 rounded-[4px] border shadow-sm sm:h-3.5 sm:w-3.5"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: "translate(-50%,-50%)",
            borderColor: border,
            backgroundColor: bg,
          }}
        />
      ))}
    </>
  );
}

function TableButton({
  table,
  occupied,
  selected,
  accent,
  onSelect,
}: {
  table: ReservationTable;
  occupied: boolean;
  selected: boolean;
  accent: string;
  onSelect: () => void;
}) {
  const state = occupied ? "occupied" : selected ? "selected" : "available";

  const border =
    state === "selected"
      ? accent
      : state === "occupied"
      ? "#ef4444"
      : "#65a30d";

  const fill =
    state === "selected"
      ? "#fed7aa"
      : state === "occupied"
      ? "#fecaca"
      : "#d9f99d";

  return (
    <button
      type="button"
      disabled={occupied}
      onClick={onSelect}
      title={`${table.name} · ${table.capacity} personas`}
      className={`absolute z-10 flex items-center justify-center text-center shadow-[0_8px_18px_rgba(27,20,16,.16)] transition hover:scale-[1.04] disabled:cursor-not-allowed ${
        table.table_shape === "round"
          ? "h-[74px] w-[74px] rounded-full sm:h-[88px] sm:w-[88px]"
          : table.table_shape === "rect"
          ? "h-[66px] w-[110px] rounded-2xl sm:h-[76px] sm:w-[132px]"
          : "h-[74px] w-[74px] rounded-2xl sm:h-[88px] sm:w-[88px]"
      }`}
      style={{
        left: `${table.pos_x ?? 50}%`,
        top: `${table.pos_y ?? 50}%`,
        transform: `translate(-50%,-50%) rotate(${table.rotation || 0}deg)`,
        border: `2px solid ${border}`,
        background: `linear-gradient(145deg, ${fill}, #fff)`,
      }}
    >
      <SeatDots
        capacity={table.capacity}
        state={state}
        accent={accent}
      />

      <div className="relative z-10 rounded-xl bg-white/85 px-2 py-1.5 shadow-sm backdrop-blur-sm">
        <Armchair
          size={14}
          className="mx-auto"
          style={{ color: border }}
        />
        <span className="mt-0.5 block max-w-[92px] truncate text-[10px] font-black text-[#1B1410] sm:text-[11px]">
          {table.name}
        </span>
        <span className="block text-[8px] font-black text-black/55 sm:text-[9px]">
          {table.capacity} personas
        </span>
      </div>
    </button>
  );
}

function PlanElement({
  element,
}: {
  element: ReservationSpaceElement;
}) {
  const Icon = ICONS[element.element_type];

  const visual =
    element.element_type === "wall"
      ? "border-none bg-[#2F2A26]"
      : element.element_type === "window"
      ? "border-2 border-sky-300 bg-sky-100/70"
      : element.element_type === "bar"
      ? "border border-amber-700 bg-amber-200/80"
      : element.element_type === "door" ||
        element.element_type === "entrance"
      ? "border border-[#6B5846] bg-[#F6E7D6]"
      : element.element_type === "plant"
      ? "border-none bg-transparent"
      : element.element_type === "restroom"
      ? "border border-sky-300 bg-sky-50/90"
      : element.element_type === "stool"
      ? "border border-amber-800 bg-amber-100 rounded-full"
      : element.element_type === "stairs"
      ? "border border-slate-400 bg-slate-100"
      : "border border-black/10 bg-white/80";

  return (
    <div
      className={`absolute flex items-center justify-center rounded-md ${visual}`}
      style={{
        left: `${element.pos_x}%`,
        top: `${element.pos_y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        transform: `translate(-50%,-50%) rotate(${element.rotation}deg)`,
      }}
    >
      {element.element_type === "plant" ? (
        <div className="relative flex h-full w-full items-center justify-center">
          <span className="absolute h-[78%] w-[78%] rounded-full bg-emerald-200/80" />
          <span className="absolute left-[4%] top-[35%] h-[34%] w-[34%] rounded-full bg-emerald-500/80" />
          <span className="absolute right-[4%] top-[18%] h-[36%] w-[36%] rounded-full bg-emerald-400/90" />
          <span className="absolute bottom-[3%] right-[24%] h-[34%] w-[34%] rounded-full bg-emerald-600/70" />
          <TreePine size={18} className="relative z-10 text-emerald-800" />
        </div>
      ) : element.element_type === "stool" ? (
        <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-amber-800 bg-amber-200 shadow-sm">
          <span className="h-[48%] w-[48%] rounded-full bg-amber-700/75" />
        </div>
      ) : element.element_type === "stairs" ? (
        <div className="flex h-full w-full flex-col justify-center gap-[2px] px-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-[2px] w-full bg-slate-500/70" />
          ))}
        </div>
      ) : element.element_type !== "wall" ? (
        <Icon
          size={element.element_type === "restroom" ? 16 : 12}
          className={
            element.element_type === "restroom"
              ? "text-sky-600"
              : "text-black/45"
          }
        />
      ) : null}

      {(element.element_type === "label" ||
        element.element_type === "bar" ||
        element.element_type === "entrance" ||
        element.element_type === "restroom" ||
        element.element_type === "stairs") && (
        <span className="ml-1 truncate text-[9px] font-black uppercase tracking-wide text-black/55">
          {element.label}
        </span>
      )}
    </div>
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
      <div className="rounded-3xl border border-dashed border-[#D7C9B9] bg-white p-10 text-center">
        <Armchair size={32} className="mx-auto text-black/20" />
        <p className="mt-3 text-sm font-black text-black/55">
          No hay mesas configuradas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            className="overflow-hidden rounded-[26px] border border-[#E3D6C8] bg-white shadow-[0_12px_34px_rgba(27,20,16,.06)]"
          >
            <div className="grid gap-0 border-b border-[#EEE5DA] sm:grid-cols-[170px_minmax(0,1fr)]">
              <div className="relative min-h-[128px] overflow-hidden bg-[#EFE7DE]">
                {space.image_url ? (
                  <img
                    src={space.image_url}
                    alt={space.name}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[128px] items-center justify-center text-black/15">
                    <Armchair size={34} />
                  </div>
                )}
              </div>

              <div className="p-5">
                <p
                  className="text-[10px] font-black uppercase tracking-[.18em]"
                  style={{ color: accent }}
                >
                  Espacio
                </p>
                <h3 className="mt-1 text-2xl font-black text-[#071B35]">
                  {space.name}
                </h3>

                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-black/45">
                  {space.floor_label && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={11} />
                      {space.floor_label}
                    </span>
                  )}
                  <span>
                    {spaceTables.length}{" "}
                    {spaceTables.length === 1 ? "mesa" : "mesas"}
                  </span>
                </div>

                {space.description && (
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/45">
                    {space.description}
                  </p>
                )}
              </div>
            </div>

            <div className="grid lg:grid-cols-[170px_minmax(0,1fr)]">
              <aside className="border-b border-[#EEE5DA] bg-[#FCF9F4] p-4 lg:border-b-0 lg:border-r">
                <p className="text-xs font-black text-[#071B35]">Leyenda</p>

                <div className="mt-4 space-y-3 text-[11px] font-bold text-black/55">
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full bg-lime-500" />
                    Disponible
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                    Seleccionada
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full bg-red-500" />
                    Ocupada
                  </div>

                  <div className="my-3 border-t border-[#E7DDD2]" />

                  <div className="flex items-center gap-2">
                    <span className="h-1 w-5 rounded bg-[#2F2A26]" />
                    Pared
                  </div>
                  <div className="flex items-center gap-2">
                    <DoorOpen size={13} />
                    Puerta
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind size={13} />
                    Ventana
                  </div>
                  <div className="flex items-center gap-2">
                    <LayoutPanelTop size={13} />
                    Barra
                  </div>
                  <div className="flex items-center gap-2">
                    <TreePine size={13} />
                    Planta
                  </div>
                </div>
              </aside>

              <div className="p-3 sm:p-5">
                <div
                  className="relative aspect-[16/10] min-h-[500px] overflow-hidden rounded-[22px] border border-[#D9C9B8] bg-[#F2E6D7] shadow-inner"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(99,77,54,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(99,77,54,.045) 1px,transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                >
                  {space.image_url && (
                    <img
                      src={space.image_url}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.045]"
                    />
                  )}

                  {spaceElements.map((element) => (
                    <PlanElement key={element.id} element={element} />
                  ))}

                  {spaceTables.map((table) => (
                    <TableButton
                      key={table.id}
                      table={table}
                      occupied={occupiedTableIds.has(table.id)}
                      selected={selectedTableId === table.id}
                      accent={accent}
                      onSelect={() => onSelect(table)}
                    />
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-[11px] font-semibold text-amber-800">
                  Los asientos alrededor de cada mesa representan su capacidad real.
                  Una mesa de 4 muestra 4 asientos; una de 6 muestra 6.
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
