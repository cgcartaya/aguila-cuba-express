"use client";

import { useMemo, useRef, useState } from "react";
import {
  Armchair,
  DoorOpen,
  Grip,
  LayoutPanelTop,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  Square,
  Trash2,
  TreePine,
  Type,
  Wind,
} from "lucide-react";

import {
  deleteReservationSpaceElement,
  saveReservationSpaceElement,
  updateReservationTableVisualPosition,
} from "@/lib/services/reservas";
import {
  SPACE_ELEMENT_LABEL,
  type ReservationSpace,
  type ReservationSpaceElement,
  type ReservationSpaceElementType,
  type ReservationTable,
} from "@/lib/reservas/types";

type Props = {
  storeId: string;
  space: ReservationSpace;
  tables: ReservationTable[];
  elements: ReservationSpaceElement[];
  onChange: () => void;
};

const ELEMENT_ICONS: Record<ReservationSpaceElementType, typeof Square> = {
  wall: Square,
  door: DoorOpen,
  window: Wind,
  bar: LayoutPanelTop,
  entrance: DoorOpen,
  plant: TreePine,
  label: Type,
};

const ELEMENT_DEFAULTS: Record<
  ReservationSpaceElementType,
  { width: number; height: number; label: string }
> = {
  wall: { width: 28, height: 4, label: "Pared" },
  door: { width: 10, height: 5, label: "Puerta" },
  window: { width: 16, height: 3, label: "Ventana" },
  bar: { width: 24, height: 9, label: "Barra" },
  entrance: { width: 14, height: 6, label: "Entrada" },
  plant: { width: 6, height: 6, label: "Planta" },
  label: { width: 18, height: 6, label: "Texto" },
};

function clamp(value: number, min = 3, max = 97) {
  return Math.max(min, Math.min(max, value));
}

export default function SpaceFloorPlanEditor({
  storeId,
  space,
  tables,
  elements,
  onChange,
}: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragging, setDragging] = useState<
    | { type: "table"; id: string }
    | { type: "element"; id: string }
    | null
  >(null);

  const spaceTables = useMemo(
    () => tables.filter((table) => table.space_id === space.id),
    [tables, space.id]
  );
  const spaceElements = useMemo(
    () => elements.filter((element) => element.space_id === space.id),
    [elements, space.id]
  );

  const pointFromEvent = (
    clientX: number,
    clientY: number
  ) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };

    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  };

  const finishDrag = async (
    clientX: number,
    clientY: number
  ) => {
    if (!dragging) return;
    const point = pointFromEvent(clientX, clientY);

    setBusy(dragging.id);

    if (dragging.type === "table") {
      const table = spaceTables.find((t) => t.id === dragging.id);
      await updateReservationTableVisualPosition(
        dragging.id,
        point.x,
        point.y,
        table?.rotation || 0
      );
    } else {
      const element = spaceElements.find((e) => e.id === dragging.id);
      if (element) {
        await saveReservationSpaceElement(storeId, {
          id: element.id,
          space_id: element.space_id,
          element_type: element.element_type,
          label: element.label || "",
          pos_x: point.x,
          pos_y: point.y,
          width: element.width,
          height: element.height,
          rotation: element.rotation,
          sort_order: element.sort_order,
        });
      }
    }

    setBusy(null);
    setDragging(null);
    onChange();
  };

  const addElement = async (type: ReservationSpaceElementType) => {
    const d = ELEMENT_DEFAULTS[type];
    setBusy("new-" + type);
    const { error } = await saveReservationSpaceElement(storeId, {
      space_id: space.id,
      element_type: type,
      label: d.label,
      pos_x: 50,
      pos_y: 50,
      width: d.width,
      height: d.height,
      rotation: 0,
      sort_order: spaceElements.length,
    });
    setBusy(null);
    if (error) return alert("No se pudo agregar el elemento.");
    onChange();
  };

  const rotateElement = async (element: ReservationSpaceElement) => {
    await saveReservationSpaceElement(storeId, {
      id: element.id,
      space_id: element.space_id,
      element_type: element.element_type,
      label: element.label || "",
      pos_x: element.pos_x,
      pos_y: element.pos_y,
      width: element.width,
      height: element.height,
      rotation: (element.rotation + 90) % 360,
      sort_order: element.sort_order,
    });
    onChange();
  };

  const removeElement = async (id: string) => {
    await deleteReservationSpaceElement(id);
    onChange();
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[.13em] text-orange-600">
            Editor del plano
          </p>
          <h3 className="mt-1 text-lg font-black text-[#071B35]">
            {space.name}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Arrastra mesas y elementos para representar el espacio.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              "wall",
              "door",
              "window",
              "bar",
              "entrance",
              "plant",
              "label",
            ] as ReservationSpaceElementType[]
          ).map((type) => {
            const Icon = ELEMENT_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => addElement(type)}
                disabled={busy === "new-" + type}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-black text-slate-600 hover:bg-slate-50"
              >
                {busy === "new-" + type ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Icon size={12} />
                )}
                {SPACE_ELEMENT_LABEL[type]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4">
        <div
          ref={canvasRef}
          onPointerMove={(e) => {
            if (dragging) e.preventDefault();
          }}
          onPointerUp={(e) => finishDrag(e.clientX, e.clientY)}
          onPointerLeave={(e) => {
            if (dragging) finishDrag(e.clientX, e.clientY);
          }}
          className="relative aspect-[16/9] min-h-[420px] touch-none overflow-hidden rounded-2xl border-2 border-slate-200 bg-[#F8F3EC]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(7,27,53,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(7,27,53,.045) 1px,transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        >
          {space.image_url && (
            <img
              src={space.image_url}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.08]"
            />
          )}

          {spaceElements.map((element) => {
            const Icon = ELEMENT_ICONS[element.element_type];

            return (
              <div
                key={element.id}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  setDragging({ type: "element", id: element.id });
                }}
                className="group absolute flex cursor-grab items-center justify-center rounded-md border border-slate-300 bg-white/90 shadow-sm active:cursor-grabbing"
                style={{
                  left: `${element.pos_x}%`,
                  top: `${element.pos_y}%`,
                  width: `${element.width}%`,
                  height: `${element.height}%`,
                  transform: `translate(-50%,-50%) rotate(${element.rotation}deg)`,
                }}
              >
                <Icon size={14} className="text-slate-500" />
                {element.element_type === "label" && (
                  <span className="ml-1 text-[9px] font-black text-slate-600">
                    {element.label || "Texto"}
                  </span>
                )}

                <div className="absolute -right-2 -top-8 hidden gap-1 group-hover:flex">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => rotateElement(element)}
                    className="rounded-md bg-[#071B35] p-1.5 text-white"
                  >
                    <RotateCw size={10} />
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => removeElement(element.id)}
                    className="rounded-md bg-red-500 p-1.5 text-white"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })}

          {spaceTables.map((table) => (
            <div
              key={table.id}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setDragging({ type: "table", id: table.id });
              }}
              className={`absolute flex cursor-grab select-none flex-col items-center justify-center border-2 border-orange-300 bg-white text-center shadow-[0_6px_16px_rgba(27,20,16,.12)] active:cursor-grabbing ${
                table.table_shape === "round"
                  ? "h-16 w-16 rounded-full"
                  : table.table_shape === "rect"
                  ? "h-14 w-24 rounded-xl"
                  : "h-16 w-16 rounded-xl"
              }`}
              style={{
                left: `${table.pos_x ?? 50}%`,
                top: `${table.pos_y ?? 50}%`,
                transform: `translate(-50%,-50%) rotate(${table.rotation || 0}deg)`,
              }}
            >
              {busy === table.id ? (
                <Loader2 size={14} className="animate-spin text-orange-500" />
              ) : (
                <>
                  <Armchair size={15} className="text-orange-500" />
                  <span className="mt-0.5 max-w-[75px] truncate text-[9px] font-black text-[#071B35]">
                    {table.name}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400">
                    {table.capacity}p
                  </span>
                </>
              )}
            </div>
          ))}

          {spaceTables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 px-6 py-5 text-center">
                <Armchair size={25} className="mx-auto text-slate-300" />
                <p className="mt-2 text-xs font-black text-slate-500">
                  Este espacio todavía no tiene mesas.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
            <Grip size={12} />
            Arrastra cualquier mesa o elemento directamente sobre el plano.
          </p>
          <p className="text-[10px] font-semibold text-slate-400">
            Las posiciones se guardan como porcentajes, por lo que el plano se adapta a móvil y desktop.
          </p>
        </div>
      </div>
    </div>
  );
}
