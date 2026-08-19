"use client";

import { useMemo, useState } from "react";
import {
  AirVent,
  Armchair,
  Camera,
  DoorOpen,
  Fan,
  Footprints,
  LayoutPanelTop,
  MapPin,
  Maximize2,
  Minimize2,
  Sofa,
  Square,
  Toilet,
  TreePine,
  Type,
  Users,
  Wind,
} from "lucide-react";

import ImageLightbox from "@/components/ui/ImageLightbox";
import { canvasAspectRatioCss } from "@/lib/reservas/canvas-shapes";
import {
  SEAT_TYPE_LABEL,
  type ReservationSpace,
  type ReservationSpaceElement,
  type ReservationTable,
  type SeatType,
} from "@/lib/reservas/types";

const SEAT_TYPE_ICON: Record<SeatType, typeof Armchair> = {
  chairs: Armchair,
  sofa: Sofa,
  stools: Users,
};

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
  wall_fan: Fan,
  floor_fan: Fan,
  split_ac: AirVent,
};

function seatPositions(capacity: number) {
  const shown = Math.min(Math.max(capacity, 1), 10);

  return Array.from({ length: shown }, (_, index) => {
    const angle = (Math.PI * 2 * index) / shown - Math.PI / 2;

    return {
      x: 50 + Math.cos(angle) * 54,
      y: 50 + Math.sin(angle) * 54,
    };
  });
}

function tableMetrics(table: ReservationTable) {
  // Basado en el canvas administrativo 1000x625.
  // Importante: porcentajes, nunca px. Así escalan exactamente igual.
  if (table.table_shape === "rect") {
    return {
      width: 13.2,
      aspectRatio: "132 / 76",
      radius: "16%",
    };
  }

  return {
    width: 8.8,
    aspectRatio: "1 / 1",
    radius: table.table_shape === "round" ? "9999px" : "16%",
  };
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

  const metrics = tableMetrics(table);

  return (
    <button
      type="button"
      disabled={occupied}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={`${table.name} · ${table.capacity} personas`}
      className="absolute z-20 flex items-center justify-center text-center shadow-[0_4px_12px_rgba(27,20,16,.16)] transition active:scale-95 disabled:cursor-not-allowed"
      style={{
        left: `${table.pos_x ?? 50}%`,
        top: `${table.pos_y ?? 50}%`,
        width: `${metrics.width}%`,
        aspectRatio: metrics.aspectRatio,
        borderRadius: metrics.radius,
        transform: `translate(-50%,-50%) rotate(${table.rotation || 0}deg)`,
        border: `2px solid ${border}`,
        background: `linear-gradient(145deg, ${fill}, #fff)`,
      }}
    >
      {seatPositions(table.capacity).map((seat, index) => (
        <span
          key={index}
          className="absolute rounded-[3px] border shadow-sm"
          style={{
            left: `${seat.x}%`,
            top: `${seat.y}%`,
            width: "16%",
            aspectRatio: "1 / 1",
            transform: "translate(-50%,-50%)",
            borderColor: border,
            backgroundColor:
              state === "selected"
                ? "#fff7ed"
                : state === "occupied"
                ? "#fee2e2"
                : "#ecfccb",
          }}
        />
      ))}

      <div className="relative z-10 flex max-w-[82%] flex-col items-center rounded-[10px] bg-white/90 px-[6%] py-[5%] shadow-sm">
        {(() => {
          const SeatIcon = SEAT_TYPE_ICON[table.seat_type];
          return (
            <SeatIcon
              className="h-auto w-[18%] min-w-[7px]"
              style={{ color: border }}
            />
          );
        })()}

        <span
          className="mt-[2%] block w-full truncate font-black text-[#1B1410]"
          style={{ fontSize: "clamp(5px, 1.05vw, 11px)" }}
        >
          {table.name}
        </span>

        <span
          className="block whitespace-nowrap font-black text-black/55"
          style={{ fontSize: "clamp(4.5px, .85vw, 9px)" }}
        >
          {table.capacity} personas
        </span>
      </div>

      {/* Amplía el área táctil sin cambiar el tamaño visual de la mesa */}
      <span className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 opacity-0" />
    </button>
  );
}

function PlanElement({ element }: { element: ReservationSpaceElement }) {
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
      : element.element_type === "wall_fan" ||
        element.element_type === "floor_fan"
      ? "border border-cyan-300 bg-cyan-50/90 rounded-full"
      : element.element_type === "split_ac"
      ? "border border-cyan-300 bg-cyan-50/90"
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
          <TreePine className="relative z-10 h-[50%] w-[50%] text-emerald-800" />
        </div>
      ) : element.element_type === "stool" ? (
        <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-amber-800 bg-amber-200 shadow-sm">
          <span className="h-[48%] w-[48%] rounded-full bg-amber-700/75" />
        </div>
      ) : element.element_type === "stairs" ? (
        <div className="flex h-full w-full flex-col justify-center gap-[7%] px-[8%]">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-[3%] w-full bg-slate-500/70" />
          ))}
        </div>
      ) : element.element_type !== "wall" ? (
        <Icon
          className={
            element.element_type === "restroom"
              ? "h-[40%] w-[40%] text-sky-600"
              : element.element_type === "wall_fan" ||
                element.element_type === "floor_fan" ||
                element.element_type === "split_ac"
              ? "h-[40%] w-[40%] text-cyan-600"
              : "h-[35%] w-[35%] text-black/45"
          }
        />
      ) : null}

      {(element.element_type === "label" ||
        element.element_type === "bar" ||
        element.element_type === "entrance" ||
        element.element_type === "restroom" ||
        element.element_type === "stairs") && (
        <span
          className="ml-[3%] max-w-[78%] truncate font-black uppercase tracking-wide text-black/55"
          style={{ fontSize: "clamp(4px, .75vw, 9px)" }}
        >
          {element.label}
        </span>
      )}
    </div>
  );
}

function NormalizedPlan({
  space,
  spaceTables,
  spaceElements,
  occupiedTableIds,
  selectedTableId,
  onSelect,
  accent,
}: {
  space: ReservationSpace;
  spaceTables: ReservationTable[];
  spaceElements: ReservationSpaceElement[];
  occupiedTableIds: Set<string>;
  selectedTableId: string | null;
  onSelect: (table: ReservationTable) => void;
  accent: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const selectedTable =
    spaceTables.find((table) => table.id === selectedTableId) || null;

  return (
    <>
      <div className="mb-2 flex items-center justify-end lg:hidden">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#E3D6C8] bg-white px-3 py-2 text-[10px] font-black text-[#071B35]"
        >
          {expanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          {expanded ? "Ajustar plano" : "Ampliar"}
        </button>
      </div>

      <div
        className={
          expanded
            ? "overflow-auto rounded-[18px] border border-[#D9C9B8] bg-[#F2E6D7]"
            : "overflow-hidden rounded-[18px] border border-[#D9C9B8] bg-[#F2E6D7]"
        }
      >
        <div
          className={
            expanded
              ? "relative w-[150%] min-w-[560px]"
              : "relative w-full"
          }
          style={{
            aspectRatio: canvasAspectRatioCss(space.canvas_shape),
            backgroundImage:
              "linear-gradient(rgba(99,77,54,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(99,77,54,.045) 1px,transparent 1px)",
            backgroundSize: "3.2% 5.12%",
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
      </div>

      {selectedTable && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/70 p-3 lg:hidden">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[.12em] text-orange-600">
              Mesa seleccionada
            </p>
            <p className="truncate text-sm font-black text-[#071B35]">
              {selectedTable.name}
            </p>
            <p className="text-[10px] font-semibold text-black/45">
              {selectedTable.capacity} personas ·{" "}
              {SEAT_TYPE_LABEL[selectedTable.seat_type]}
            </p>
          </div>

          <span
            className="shrink-0 rounded-full px-3 py-1.5 text-[9px] font-black text-white"
            style={{ backgroundColor: accent }}
          >
            Seleccionada
          </span>
        </div>
      )}
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
  const [lightboxSpace, setLightboxSpace] = useState<ReservationSpace | null>(
    null
  );

  const activeSpaces = useMemo(
    () =>
      spaces.filter((space) =>
        tables.some((table) => table.space_id === space.id)
      ),
    [spaces, tables]
  );

  if (tables.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[#D7C9B9] bg-white p-8 text-center">
        <Armchair size={30} className="mx-auto text-black/20" />
        <p className="mt-3 text-sm font-black text-black/55">
          No hay mesas configuradas.
        </p>
      </div>
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
            className="min-w-0 overflow-hidden rounded-[22px] border border-[#E3D6C8] bg-white shadow-[0_12px_34px_rgba(27,20,16,.06)] sm:rounded-[26px]"
          >
            {space.image_url && (
              <div className="relative h-36 w-full sm:h-44">
                <img
                  src={space.image_url}
                  alt={space.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />

                <button
                  type="button"
                  onClick={() => setLightboxSpace(space)}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black text-[#071B35] shadow-sm backdrop-blur transition active:scale-95"
                >
                  <Camera size={13} />
                  Ver foto del ambiente
                </button>
              </div>
            )}

            <div className="border-b border-[#EEE5DA] p-4 sm:p-5">
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
                <p className="mt-3 text-sm font-semibold leading-6 text-black/45">
                  {space.description}
                </p>
              )}
            </div>

            {/* En móvil solo mostramos los estados relevantes */}
            <div className="border-b border-[#EEE5DA] bg-[#FCF9F4] px-4 py-3 lg:hidden">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-black text-black/55">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-lime-500" />
                  Disponible
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  Tu selección
                </span>

                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  No disponible
                </span>
              </div>
            </div>

            <div className="grid min-w-0 lg:grid-cols-[170px_minmax(0,1fr)]">
              <aside className="hidden border-r border-[#EEE5DA] bg-[#FCF9F4] p-4 lg:block">
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
                </div>
              </aside>

              <div className="min-w-0 p-3 sm:p-5">
                <NormalizedPlan
                  space={space}
                  spaceTables={spaceTables}
                  spaceElements={spaceElements}
                  occupiedTableIds={occupiedTableIds}
                  selectedTableId={selectedTableId}
                  onSelect={onSelect}
                  accent={accent}
                />

                <p className="mt-3 text-center text-[10px] font-semibold text-black/40 lg:hidden">
                  Vista completa del salón. Pulsa “Ampliar” para inspeccionar detalles.
                </p>
              </div>
            </div>
          </section>
        );
      })}

      {lightboxSpace?.image_url && (
        <ImageLightbox
          src={lightboxSpace.image_url}
          alt={lightboxSpace.name}
          onClose={() => setLightboxSpace(null)}
        />
      )}
    </div>
  );
}
