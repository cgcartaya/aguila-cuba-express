"use client";

import { useMemo, useState } from "react";
import {
  Armchair,
  Camera,
  DoorOpen,
  Footprints,
  LayoutPanelTop,
  MapPin,
  Maximize2,
  Minimize2,
  Sofa,
  TreePine,
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

// Dibujo simplificado de cada elemento (todo con capas de CSS, sin
// imágenes) para que se parezca a lo que realmente es en el plano
// que ve el cliente — mismo criterio que en el editor admin.
function StaffFigure({
  gender,
}: {
  gender: "male" | "female";
}) {
  const female = gender === "female";

  return (
    <svg viewBox="0 0 64 92" className="h-full w-full drop-shadow-sm" aria-hidden="true">
      <ellipse cx="32" cy="84" rx="17" ry="5" fill="rgba(15,23,42,.14)" />
      <circle cx="32" cy="17" r="10" fill="#E7B98B" />

      {female ? (
        <>
          <path d="M21 17c0-9 5-14 11-14s11 5 11 14c-2-5-6-8-11-8s-9 3-11 8Z" fill="#4B2E25" />
          <circle cx="43" cy="16" r="4" fill="#4B2E25" />
        </>
      ) : (
        <path d="M22 14c1-8 6-11 11-11 6 0 10 4 10 11-4-3-7-4-11-4-3 0-7 1-10 4Z" fill="#382820" />
      )}

      <rect x="28" y="25" width="8" height="7" rx="3" fill="#D9A97D" />

      {female ? (
        <path d="M20 34c4-4 8-6 12-6s8 2 12 6l5 30H15l5-30Z" fill="#D946EF" />
      ) : (
        <path d="M18 35c4-5 9-7 14-7s10 2 14 7l2 29H16l2-29Z" fill="#2563EB" />
      )}

      <path d="M27 30h10l4 29H23l4-29Z" fill="#F8FAFC" />
      <path d="M28 31l4 7 4-7" fill="none" stroke="#CBD5E1" strokeWidth="1.8" />

      <path d="M19 38 9 53" stroke="#E7B98B" strokeWidth="6" strokeLinecap="round" />
      <path d="M45 38 55 49" stroke="#E7B98B" strokeWidth="6" strokeLinecap="round" />

      <ellipse cx="55" cy="47" rx="9" ry="3" fill="#475569" />
      <rect x="54" y="44" width="2" height="3" rx="1" fill="#94A3B8" />
      <circle cx="55" cy="43" r="2.5" fill="#F59E0B" />

      <path d="M25 62 23 80" stroke="#1E293B" strokeWidth="7" strokeLinecap="round" />
      <path d="M39 62 41 80" stroke="#1E293B" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="22" cy="82" rx="6" ry="3" fill="#0F172A" />
      <ellipse cx="42" cy="82" rx="6" ry="3" fill="#0F172A" />
    </svg>
  );
}
function ElementArt({ type }: { type: ReservationSpaceElement["element_type"] }) {
  switch (type) {
    case "waiter":
      return (
        <div className="absolute inset-[4%] flex items-center justify-center">
          <StaffFigure gender="male" />
        </div>
      );

    case "waitress":
      return (
        <div className="absolute inset-[4%] flex items-center justify-center">
          <StaffFigure gender="female" />
        </div>
      );
    case "plant":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute h-[78%] w-[78%] rounded-full bg-emerald-200/80" />
          <span className="absolute left-[4%] top-[35%] h-[34%] w-[34%] rounded-full bg-emerald-500/80" />
          <span className="absolute right-[4%] top-[18%] h-[36%] w-[36%] rounded-full bg-emerald-400/90" />
          <span className="absolute bottom-[3%] right-[24%] h-[34%] w-[34%] rounded-full bg-emerald-600/70" />
          <TreePine className="relative z-10 h-[50%] w-[50%] text-emerald-800" />
        </div>
      );

    case "stool":
      return (
        <div className="absolute inset-0 flex items-center justify-center rounded-full border-2 border-amber-800 bg-amber-200 shadow-sm">
          <span className="h-[48%] w-[48%] rounded-full bg-amber-700/75" />
        </div>
      );

    case "stairs":
      return (
        <div className="absolute inset-0 flex flex-col justify-center gap-[7%] px-[8%]">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-[3%] w-full bg-slate-500/70" />
          ))}
        </div>
      );

    case "door":
    case "entrance":
      return (
        <div className="absolute inset-0">
          <span className="absolute bottom-0 left-0 h-[88%] w-[9%] rounded-sm bg-[#8B6F52]" />
          <span
            className="absolute bottom-0 left-0"
            style={{
              width: "88%",
              height: "88%",
              borderTop: "1.5px dashed rgba(139,111,82,.55)",
              borderRight: "1.5px dashed rgba(139,111,82,.55)",
              borderRadius: "0 100% 0 0",
            }}
          />
          <span className="absolute bottom-0 left-0 h-[6%] w-full bg-[#C8BAAA]/70" />
        </div>
      );

    case "window":
      return (
        <div className="absolute inset-0 flex items-stretch justify-evenly px-[10%] py-[16%]">
          <span className="w-[10%] rounded-full bg-sky-500/60" />
          <span className="w-[10%] rounded-full bg-sky-500/60" />
        </div>
      );

    case "bar":
      return (
        <div className="absolute inset-0 overflow-hidden rounded-md">
          <div
            className="h-full w-full"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(120,72,24,.22) 0px, rgba(120,72,24,.22) 3px, rgba(120,72,24,.06) 3px, rgba(120,72,24,.06) 11px)",
            }}
          />
          <div className="absolute bottom-[-16%] left-0 flex w-full justify-around">
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="h-[30%] w-[7%] rounded-full bg-amber-800/70" />
            ))}
          </div>
        </div>
      );

    case "restroom":
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[4%]">
          <span className="h-[22%] w-[46%] rounded-t-sm border border-sky-400 bg-sky-200" />
          <span className="h-[46%] w-[68%] rounded-b-full rounded-t-md border border-sky-400 bg-sky-100" />
        </div>
      );

    case "wall_fan":
    case "floor_fan":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute h-[88%] w-[88%] rounded-full border-2 border-cyan-400/70" />
          {[0, 90, 180, 270].map((deg) => (
            <span
              key={deg}
              className="absolute h-[36%] w-[15%] rounded-full bg-cyan-500/70"
              style={{ transform: `rotate(${deg}deg) translateY(-34%)` }}
            />
          ))}
          <span className="absolute h-[18%] w-[18%] rounded-full bg-cyan-700" />
          {type === "floor_fan" && (
            <span className="absolute bottom-[-10%] h-[16%] w-[7%] rounded-full bg-cyan-700/70" />
          )}
        </div>
      );

    case "split_ac":
      return (
        <div className="absolute inset-0 flex flex-col justify-center gap-[12%] rounded-md bg-white px-[8%] shadow-inner">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="h-[10%] w-full rounded-full bg-cyan-400/50" />
          ))}
        </div>
      );

    default:
      return null;
  }
}

function PlanElement({ element }: { element: ReservationSpaceElement }) {
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
      : element.element_type === "waiter" || element.element_type === "waitress"
      ? "border border-slate-200 bg-white/95"
      : "border border-black/10 bg-white/80";

  return (
    <div
      className={`absolute rounded-md ${visual}`}
      style={{
        left: `${element.pos_x}%`,
        top: `${element.pos_y}%`,
        width: `${element.width}%`,
        height: `${element.height}%`,
        transform: `translate(-50%,-50%) rotate(${element.rotation}deg)`,
      }}
    >
      <ElementArt type={element.element_type} />

      {element.element_type === "label" && (
        <span
          className="absolute inset-0 flex items-center justify-center truncate px-1 font-black uppercase tracking-wide text-black/55"
          style={{ fontSize: "clamp(4px, .75vw, 9px)" }}
        >
          {element.label}
        </span>
      )}

      {(element.element_type === "bar" ||
        element.element_type === "entrance" ||
        element.element_type === "restroom" ||
        element.element_type === "stairs" ||
        element.element_type === "waiter" ||
        element.element_type === "waitress") && (
        <span
          className="absolute inset-x-[4%] bottom-[4%] truncate rounded bg-white/75 px-[3%] text-center font-black uppercase tracking-wide text-black/55"
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

