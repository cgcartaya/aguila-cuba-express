"use client";

import { useMemo, useRef, useState } from "react";
import {
  Armchair,
  DoorOpen,
  Grip,
  LayoutPanelTop,
  Loader2,
  RotateCw,
  Save,
  Square,
  Trash2,
  TreePine,
  Type,
  Wind,
  X,
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

function SeatDots({ capacity }: { capacity: number }) {
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
            className="absolute h-2.5 w-2.5 rounded-full border border-orange-300 bg-orange-100 shadow-sm"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: "translate(-50%,-50%)",
            }}
          />
        );
      })}
    </>
  );
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
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

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

  const selectedElement =
    spaceElements.find((element) => element.id === selectedElementId) || null;

  const selectedTable =
    spaceTables.find((table) => table.id === selectedTableId) || null;

  const [draft, setDraft] = useState<{
    label: string;
    width: number;
    height: number;
    rotation: number;
  } | null>(null);

  const selectElement = (element: ReservationSpaceElement) => {
    setSelectedTableId(null);
    setSelectedElementId(element.id);
    setDraft({
      label: element.label || "",
      width: Number(element.width),
      height: Number(element.height),
      rotation: Number(element.rotation),
    });
  };

  const pointFromEvent = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };

    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  };

  const finishDrag = async (clientX: number, clientY: number) => {
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
      setSelectedTableId(dragging.id);
      setSelectedElementId(null);
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
        selectElement(element);
      }
    }

    setBusy(null);
    setDragging(null);
    onChange();
  };

  const addElement = async (type: ReservationSpaceElementType) => {
    const d = ELEMENT_DEFAULTS[type];
    setBusy("new-" + type);

    const { data, error } = await saveReservationSpaceElement(storeId, {
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

    if (error) {
      alert("No se pudo agregar el elemento.");
      return;
    }

    if (data?.id) {
      setSelectedElementId(data.id);
      setSelectedTableId(null);
      setDraft({
        label: d.label,
        width: d.width,
        height: d.height,
        rotation: 0,
      });
    }

    onChange();
  };

  const saveSelectedElement = async () => {
    if (!selectedElement || !draft) return;

    setBusy(selectedElement.id);

    const { error } = await saveReservationSpaceElement(storeId, {
      id: selectedElement.id,
      space_id: selectedElement.space_id,
      element_type: selectedElement.element_type,
      label: draft.label,
      pos_x: selectedElement.pos_x,
      pos_y: selectedElement.pos_y,
      width: Math.max(2, Math.min(80, Number(draft.width) || 2)),
      height: Math.max(2, Math.min(80, Number(draft.height) || 2)),
      rotation: Number(draft.rotation) || 0,
      sort_order: selectedElement.sort_order,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo guardar el elemento.");
      return;
    }

    onChange();
  };

  const removeSelectedElement = async () => {
    if (!selectedElement) return;

    if (!confirm(`¿Eliminar "${selectedElement.label || SPACE_ELEMENT_LABEL[selectedElement.element_type]}"?`)) {
      return;
    }

    setBusy(selectedElement.id);
    const { error } = await deleteReservationSpaceElement(selectedElement.id);
    setBusy(null);

    if (error) {
      alert("No se pudo eliminar el elemento.");
      return;
    }

    setSelectedElementId(null);
    setDraft(null);
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
            Agrega, mueve, selecciona y edita cualquier elemento del espacio.
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

      <div className="grid xl:grid-cols-[minmax(0,1fr)_290px]">
        <div className="p-4">
          <div
            ref={canvasRef}
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
              const selected = selectedElementId === element.id;

              return (
                <div
                  key={element.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDragging({ type: "element", id: element.id });
                    selectElement(element);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectElement(element);
                  }}
                  className={`group absolute flex cursor-grab items-center justify-center rounded-md border bg-white/90 shadow-sm active:cursor-grabbing ${
                    selected
                      ? "border-orange-400 ring-2 ring-orange-200"
                      : "border-slate-300"
                  }`}
                  style={{
                    left: `${element.pos_x}%`,
                    top: `${element.pos_y}%`,
                    width: `${element.width}%`,
                    height: `${element.height}%`,
                    transform: `translate(-50%,-50%) rotate(${element.rotation}deg)`,
                  }}
                >
                  <Icon size={14} className="text-slate-500" />

                  {(element.element_type === "label" ||
                    element.element_type === "bar" ||
                    element.element_type === "entrance") && (
                    <span className="ml-1 truncate text-[9px] font-black text-slate-600">
                      {element.label || SPACE_ELEMENT_LABEL[element.element_type]}
                    </span>
                  )}
                </div>
              );
            })}

            {spaceTables.map((table) => {
              const selected = selectedTableId === table.id;

              return (
                <div
                  key={table.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDragging({ type: "table", id: table.id });
                    setSelectedTableId(table.id);
                    setSelectedElementId(null);
                    setDraft(null);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTableId(table.id);
                    setSelectedElementId(null);
                    setDraft(null);
                  }}
                  className={`absolute flex cursor-grab select-none items-center justify-center bg-white text-center shadow-[0_6px_16px_rgba(27,20,16,.12)] active:cursor-grabbing ${
                    table.table_shape === "round"
                      ? "h-16 w-16 rounded-full"
                      : table.table_shape === "rect"
                      ? "h-14 w-24 rounded-xl"
                      : "h-16 w-16 rounded-xl"
                  } ${
                    selected
                      ? "border-2 border-orange-500 ring-2 ring-orange-200"
                      : "border-2 border-orange-300"
                  }`}
                  style={{
                    left: `${table.pos_x ?? 50}%`,
                    top: `${table.pos_y ?? 50}%`,
                    transform: `translate(-50%,-50%) rotate(${table.rotation || 0}deg)`,
                  }}
                >
                  <SeatDots capacity={table.capacity} />

                  {busy === table.id ? (
                    <Loader2 size={14} className="animate-spin text-orange-500" />
                  ) : (
                    <div className="relative z-10 rounded-lg bg-white/90 px-1.5 py-1">
                      <Armchair size={13} className="mx-auto text-orange-500" />
                      <span className="mt-0.5 block max-w-[70px] truncate text-[9px] font-black text-[#071B35]">
                        {table.name}
                      </span>
                      <span className="block text-[8px] font-black text-orange-600">
                        {table.capacity} personas
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setSelectedElementId(null);
                setSelectedTableId(null);
                setDraft(null);
              }}
              className="absolute inset-0 -z-10"
              aria-label="Deseleccionar"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <Grip size={12} />
              Arrastra para mover. Haz clic para editar o eliminar.
            </p>

            <p className="text-[10px] font-semibold text-slate-400">
              Los puntos alrededor de cada mesa representan sus asientos.
            </p>
          </div>
        </div>

        <aside className="border-t border-slate-100 bg-slate-50/60 p-4 xl:border-l xl:border-t-0">
          {!selectedElement && !selectedTable && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5 text-center">
              <Square size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-black text-slate-600">
                Selecciona algo del plano
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                Podrás editar texto, tamaño, rotación o eliminar elementos.
              </p>
            </div>
          )}

          {selectedTable && (
            <div className="rounded-2xl border border-orange-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-orange-600">
                Mesa seleccionada
              </p>

              <h4 className="mt-1 text-lg font-black text-[#071B35]">
                {selectedTable.name}
              </h4>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase text-slate-400">
                    Capacidad
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-700">
                    {selectedTable.capacity} personas
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-[9px] font-black uppercase text-slate-400">
                    Forma
                  </p>
                  <p className="mt-1 text-sm font-black capitalize text-slate-700">
                    {selectedTable.table_shape}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[10px] font-semibold leading-4 text-slate-400">
                La capacidad y forma se editan desde la pestaña Mesas. Aquí solo estás ubicándola en el plano.
              </p>
            </div>
          )}

          {selectedElement && draft && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-orange-600">
                    Elemento seleccionado
                  </p>
                  <h4 className="mt-1 text-base font-black text-[#071B35]">
                    {SPACE_ELEMENT_LABEL[selectedElement.element_type]}
                  </h4>
                </div>

                <button
                  onClick={() => {
                    setSelectedElementId(null);
                    setDraft(null);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              </div>

              <label className="mt-4 block text-[10px] font-black uppercase text-slate-400">
                Texto / nombre
                <input
                  value={draft.label}
                  onChange={(e) =>
                    setDraft({ ...draft, label: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-300"
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[10px] font-black uppercase text-slate-400">
                  Ancho %
                  <input
                    type="number"
                    min={2}
                    max={80}
                    value={draft.width}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        width: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                  />
                </label>

                <label className="text-[10px] font-black uppercase text-slate-400">
                  Alto %
                  <input
                    type="number"
                    min={2}
                    max={80}
                    value={draft.height}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        height: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                  />
                </label>
              </div>

              <label className="mt-3 block text-[10px] font-black uppercase text-slate-400">
                Rotación
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    value={draft.rotation}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        rotation: Number(e.target.value),
                      })
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                  />

                  <button
                    onClick={() =>
                      setDraft({
                        ...draft,
                        rotation: (draft.rotation + 90) % 360,
                      })
                    }
                    className="rounded-xl border border-slate-200 px-3 text-slate-500"
                  >
                    <RotateCw size={14} />
                  </button>
                </div>
              </label>

              <button
                onClick={saveSelectedElement}
                disabled={busy === selectedElement.id}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                {busy === selectedElement.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Guardar cambios
              </button>

              <button
                onClick={removeSelectedElement}
                disabled={busy === selectedElement.id}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 disabled:opacity-50"
              >
                <Trash2 size={14} />
                Eliminar del plano
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
