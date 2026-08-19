"use client";

import { useMemo, useRef, useState } from "react";
import {
  Armchair,
  Circle,
  Copy,
  DoorOpen,
  Grid3X3,
  LayoutPanelTop,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RectangleHorizontal,
  RotateCw,
  Save,
  Square,
  Trash2,
  TreePine,
  Type,
  Undo2,
  Redo2,
  Wind,
  X,
} from "lucide-react";

import {
  deleteReservationSpaceElement,
  deleteReservationTable,
  saveReservationSpaceElement,
  saveReservationTable,
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
  onClose?: () => void;
};

type TableShape = "round" | "square" | "rect";
type PropertiesTab = "general" | "position";

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
  wall: { width: 28, height: 3.6, label: "Pared" },
  door: { width: 10, height: 5, label: "Puerta" },
  window: { width: 14, height: 3, label: "Ventana" },
  bar: { width: 20, height: 8, label: "Barra" },
  entrance: { width: 16, height: 5, label: "Entrada principal" },
  plant: { width: 6, height: 6, label: "Planta" },
  label: { width: 20, height: 5, label: "Texto" },
};

function clamp(value: number, min = 3, max = 97) {
  return Math.max(min, Math.min(max, value));
}

function getSeatPositions(capacity: number) {
  const shown = Math.min(Math.max(capacity, 1), 10);

  return Array.from({ length: shown }, (_, index) => {
    const angle = (Math.PI * 2 * index) / shown - Math.PI / 2;
    return {
      x: 50 + Math.cos(angle) * 54,
      y: 50 + Math.sin(angle) * 54,
    };
  });
}

function TableVisual({
  table,
  selected,
  busy,
}: {
  table: ReservationTable;
  selected: boolean;
  busy: boolean;
}) {
  const isRound = table.table_shape === "round";
  const isRect = table.table_shape === "rect";

  return (
    <div
      className={`relative flex items-center justify-center text-center shadow-[0_9px_22px_rgba(15,23,42,.18)] transition ${
        isRound
          ? "h-[92px] w-[92px] rounded-full"
          : isRect
          ? "h-[78px] w-[132px] rounded-2xl"
          : "h-[92px] w-[92px] rounded-2xl"
      } ${
        selected
          ? "border-2 border-orange-500 bg-orange-100 ring-2 ring-orange-200 ring-offset-2"
          : "border-2 border-lime-600 bg-lime-200"
      }`}
    >
      {getSeatPositions(table.capacity).map((seat, index) => (
        <span
          key={index}
          className={`absolute h-4 w-4 rounded-[5px] border shadow-sm ${
            selected
              ? "border-orange-500 bg-orange-200"
              : "border-lime-700 bg-lime-300"
          }`}
          style={{
            left: `${seat.x}%`,
            top: `${seat.y}%`,
            transform: "translate(-50%,-50%)",
          }}
        />
      ))}

      <div className="relative z-10 rounded-xl bg-white/90 px-2.5 py-2 shadow-sm backdrop-blur">
        {busy ? (
          <Loader2 size={16} className="mx-auto animate-spin text-orange-500" />
        ) : (
          <>
            <span className="block max-w-[96px] truncate text-[12px] font-black text-[#071B35]">
              {table.name}
            </span>
            <span className="mt-0.5 block text-[10px] font-black text-slate-500">
              {table.capacity} personas
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function SpaceFloorPlanEditor({
  storeId,
  space,
  tables,
  elements,
  onChange,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [propertiesTab, setPropertiesTab] = useState<PropertiesTab>("general");
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [savedPulse, setSavedPulse] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [positionOverrides, setPositionOverrides] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const [dragging, setDragging] = useState<
    | {
        type: "table" | "element";
        id: string;
        pointerId: number;
        offsetX: number;
        offsetY: number;
      }
    | null
  >(null);

  const [elementDraft, setElementDraft] = useState<{
    label: string;
    width: number;
    height: number;
    rotation: number;
    pos_x: number;
    pos_y: number;
  } | null>(null);

  const [tableDraft, setTableDraft] = useState<{
    name: string;
    capacity: number;
    table_shape: TableShape;
    rotation: number;
    pos_x: number;
    pos_y: number;
  } | null>(null);

  const spaceTables = useMemo(
    () => tables.filter((table) => table.space_id === space.id),
    [tables, space.id]
  );

  const spaceElements = useMemo(
    () => elements.filter((element) => element.space_id === space.id),
    [elements, space.id]
  );

  const selectedElement =
    spaceElements.find((item) => item.id === selectedElementId) || null;

  const selectedTable =
    spaceTables.find((item) => item.id === selectedTableId) || null;

  const selectElement = (element: ReservationSpaceElement) => {
    setSelectedTableId(null);
    setTableDraft(null);
    setSelectedElementId(element.id);
    setPropertiesTab("general");
    setElementDraft({
      label: element.label || "",
      width: Number(element.width),
      height: Number(element.height),
      rotation: Number(element.rotation),
      pos_x: Number(element.pos_x),
      pos_y: Number(element.pos_y),
    });
  };

  const selectTable = (table: ReservationTable) => {
    setSelectedElementId(null);
    setElementDraft(null);
    setSelectedTableId(table.id);
    setPropertiesTab("general");
    setTableDraft({
      name: table.name,
      capacity: table.capacity,
      table_shape: table.table_shape,
      rotation: table.rotation || 0,
      pos_x: Number(table.pos_x ?? 50),
      pos_y: Number(table.pos_y ?? 50),
    });
  };

  const deselect = () => {
    setSelectedElementId(null);
    setSelectedTableId(null);
    setElementDraft(null);
    setTableDraft(null);
  };

  const pointFromEvent = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };

    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  };

  const applySnap = (value: number) => {
    if (!snapToGrid) return Math.round(value * 10) / 10;
    return Math.round(value);
  };

  const getPositionKey = (type: "table" | "element", id: string) =>
    `${type}:${id}`;

  const getTablePosition = (table: ReservationTable) =>
    positionOverrides[getPositionKey("table", table.id)] || {
      x: Number(table.pos_x ?? 50),
      y: Number(table.pos_y ?? 50),
    };

  const getElementPosition = (element: ReservationSpaceElement) =>
    positionOverrides[getPositionKey("element", element.id)] || {
      x: Number(element.pos_x),
      y: Number(element.pos_y),
    };

  const clampElementPosition = (
    element: ReservationSpaceElement,
    x: number,
    y: number
  ) => {
    const halfW = Math.max(1, Number(element.width) / 2);
    const halfH = Math.max(1, Number(element.height) / 2);

    return {
      x: Math.max(halfW, Math.min(100 - halfW, x)),
      y: Math.max(halfH, Math.min(100 - halfH, y)),
    };
  };

  const setLivePosition = (
    type: "table" | "element",
    id: string,
    x: number,
    y: number
  ) => {
    setPositionOverrides((prev) => ({
      ...prev,
      [getPositionKey(type, id)]: { x, y },
    }));
  };

  const beginDrag = (
    e: React.PointerEvent<HTMLElement>,
    type: "table" | "element",
    id: string,
    currentX: number,
    currentY: number
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const pointer = pointFromEvent(e.clientX, e.clientY);

    e.currentTarget.setPointerCapture?.(e.pointerId);

    setDragging({
      type,
      id,
      pointerId: e.pointerId,
      offsetX: pointer.x - currentX,
      offsetY: pointer.y - currentY,
    });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || e.pointerId !== dragging.pointerId) return;

    const pointer = pointFromEvent(e.clientX, e.clientY);
    let x = applySnap(pointer.x - dragging.offsetX);
    let y = applySnap(pointer.y - dragging.offsetY);

    if (dragging.type === "element") {
      const element = spaceElements.find((item) => item.id === dragging.id);
      if (element) {
        const clamped = clampElementPosition(element, x, y);
        x = clamped.x;
        y = clamped.y;
      }
    } else {
      x = clamp(x, 4, 96);
      y = clamp(y, 4, 96);
    }

    setLivePosition(dragging.type, dragging.id, x, y);

    if (dragging.type === "table" && selectedTableId === dragging.id) {
      setTableDraft((draft) => (draft ? { ...draft, pos_x: x, pos_y: y } : draft));
    }

    if (dragging.type === "element" && selectedElementId === dragging.id) {
      setElementDraft((draft) =>
        draft ? { ...draft, pos_x: x, pos_y: y } : draft
      );
    }
  };

  const finishCurrentDrag = async (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || e.pointerId !== dragging.pointerId) return;

    const key = getPositionKey(dragging.type, dragging.id);
    const current = positionOverrides[key];

    setDragging(null);

    if (!current) return;

    setBusy(dragging.id);

    if (dragging.type === "table") {
      const table = spaceTables.find((item) => item.id === dragging.id);
      if (table) {
        const { error } = await updateReservationTableVisualPosition(
          table.id,
          current.x,
          current.y,
          table.rotation || 0
        );

        if (error) {
          alert("No se pudo guardar la nueva posición de la mesa.");
        }
      }
    } else {
      const element = spaceElements.find((item) => item.id === dragging.id);
      if (element) {
        const { error } = await saveReservationSpaceElement(storeId, {
          id: element.id,
          space_id: element.space_id,
          element_type: element.element_type,
          label: element.label || "",
          pos_x: current.x,
          pos_y: current.y,
          width: element.width,
          height: element.height,
          rotation: element.rotation,
          sort_order: element.sort_order,
        });

        if (error) {
          alert("No se pudo guardar la nueva posición del elemento.");
        }
      }
    }

    setBusy(null);
    onChange();
    pulseSaved();
  };

  const cancelCurrentDrag = () => {
    setDragging(null);
  };

  const pulseSaved = () => {
    setSavedPulse(true);
    window.setTimeout(() => setSavedPulse(false), 1200);
  };


  const addElement = async (type: ReservationSpaceElementType) => {
    const defaults = ELEMENT_DEFAULTS[type];
    setBusy(`new-${type}`);

    const { data, error } = await saveReservationSpaceElement(storeId, {
      space_id: space.id,
      element_type: type,
      label: defaults.label,
      pos_x: 50,
      pos_y: 50,
      width: defaults.width,
      height: defaults.height,
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
      setElementDraft({
        label: defaults.label,
        width: defaults.width,
        height: defaults.height,
        rotation: 0,
        pos_x: 50,
        pos_y: 50,
      });
    }

    onChange();
    pulseSaved();
  };

  const addTable = async (shape: TableShape) => {
    const nextNumber =
      spaceTables.reduce((max, table) => {
        const match = table.name.match(/(\d+)/);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0) + 1;

    const capacity = shape === "rect" ? 6 : 4;
    const name = `Mesa ${nextNumber}`;

    setBusy(`new-table-${shape}`);

    const { data, error } = await saveReservationTable(storeId, {
      name,
      capacity,
      seat_type: "chairs",
      zone: space.name,
      space_id: space.id,
      pos_row: 0,
      pos_col: 0,
      pos_x: 50,
      pos_y: 50,
      rotation: 0,
      table_shape: shape,
      is_active: true,
      sort_order: spaceTables.length,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo crear la mesa.");
      return;
    }

    if (data?.id) {
      const table = data as ReservationTable;
      setSelectedTableId(table.id);
      setSelectedElementId(null);
      setTableDraft({
        name: table.name,
        capacity: table.capacity,
        table_shape: table.table_shape,
        rotation: table.rotation || 0,
        pos_x: Number(table.pos_x ?? 50),
        pos_y: Number(table.pos_y ?? 50),
      });
    }

    onChange();
    pulseSaved();
  };

  const saveSelectedElement = async () => {
    if (!selectedElement || !elementDraft) return;

    setBusy(selectedElement.id);

    const { error } = await saveReservationSpaceElement(storeId, {
      id: selectedElement.id,
      space_id: selectedElement.space_id,
      element_type: selectedElement.element_type,
      label: elementDraft.label,
      pos_x: clamp(elementDraft.pos_x),
      pos_y: clamp(elementDraft.pos_y),
      width: Math.max(2, Math.min(80, elementDraft.width || 2)),
      height: Math.max(2, Math.min(80, elementDraft.height || 2)),
      rotation: elementDraft.rotation || 0,
      sort_order: selectedElement.sort_order,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo guardar el elemento.");
      return;
    }

    const clamped = clampElementPosition(
      selectedElement,
      elementDraft.pos_x,
      elementDraft.pos_y
    );
    setLivePosition("element", selectedElement.id, clamped.x, clamped.y);

    onChange();
    pulseSaved();
  };

  const saveSelectedTable = async () => {
    if (!selectedTable || !tableDraft) return;

    setBusy(selectedTable.id);

    const { error } = await saveReservationTable(storeId, {
      id: selectedTable.id,
      name: tableDraft.name.trim() || selectedTable.name,
      capacity: Math.max(1, Math.min(20, tableDraft.capacity || 1)),
      seat_type: selectedTable.seat_type,
      zone: space.name,
      space_id: space.id,
      pos_row: selectedTable.pos_row,
      pos_col: selectedTable.pos_col,
      pos_x: clamp(tableDraft.pos_x),
      pos_y: clamp(tableDraft.pos_y),
      rotation: tableDraft.rotation || 0,
      table_shape: tableDraft.table_shape,
      is_active: selectedTable.is_active,
      sort_order: selectedTable.sort_order,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo guardar la mesa.");
      return;
    }

    setLivePosition(
      "table",
      selectedTable.id,
      clamp(tableDraft.pos_x, 4, 96),
      clamp(tableDraft.pos_y, 4, 96)
    );

    onChange();
    pulseSaved();
  };

  const removeSelectedElement = async () => {
    if (!selectedElement) return;

    if (!confirm(`¿Eliminar "${selectedElement.label || SPACE_ELEMENT_LABEL[selectedElement.element_type]}" del plano?`)) {
      return;
    }

    setBusy(selectedElement.id);
    const { error } = await deleteReservationSpaceElement(selectedElement.id);
    setBusy(null);

    if (error) {
      alert("No se pudo eliminar el elemento.");
      return;
    }

    deselect();
    onChange();
    pulseSaved();
  };

  const removeSelectedTable = async () => {
    if (!selectedTable) return;

    if (!confirm(`¿Eliminar "${selectedTable.name}"? Esto también puede eliminar reservas asociadas a esa mesa.`)) {
      return;
    }

    setBusy(selectedTable.id);
    const { error } = await deleteReservationTable(selectedTable.id);
    setBusy(null);

    if (error) {
      alert("No se pudo eliminar la mesa.");
      return;
    }

    deselect();
    onChange();
    pulseSaved();
  };

  const duplicateElement = async (element: ReservationSpaceElement) => {
    setBusy(`duplicate-${element.id}`);

    const { error } = await saveReservationSpaceElement(storeId, {
      space_id: element.space_id,
      element_type: element.element_type,
      label: element.label || "",
      pos_x: clamp(Number(element.pos_x) + 4),
      pos_y: clamp(Number(element.pos_y) + 4),
      width: element.width,
      height: element.height,
      rotation: element.rotation,
      sort_order: spaceElements.length,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo duplicar.");
      return;
    }

    onChange();
    pulseSaved();
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_46px_rgba(15,23,42,.07)]">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-6">
        <div>
          <p className="text-[11px] font-bold text-slate-400">
            Espacios <span className="px-1">›</span> {space.name}
            <span className="px-1">›</span>
            <span className="text-orange-600">Editor del plano</span>
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#071B35]">
            Editor del plano
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-400">
            Diseña y organiza este espacio arrastrando mesas y elementos.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"
            >
              Salir del editor
            </button>
          )}

          <button
            onClick={() => {
              if (selectedTable && tableDraft) {
                void saveSelectedTable();
              } else if (selectedElement && elementDraft) {
                void saveSelectedElement();
              } else {
                pulseSaved();
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF641F] px-4 py-2.5 text-xs font-black text-white shadow-sm"
          >
            <Save size={14} />
            Guardar cambios
          </button>

          <span
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black ${
              savedPulse
                ? "bg-emerald-100 text-emerald-700"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {savedPulse ? "Guardado" : "Guardado automático"}
          </span>
        </div>
      </div>

      {/* Toolbars */}
      <div className="grid gap-4 border-b border-slate-100 bg-[#FBFCFE] p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black text-[#071B35]">Agregar elemento</p>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
            Añádelo al centro del plano y luego arrástralo.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => addTable("round")}
              disabled={busy === "new-table-round"}
              className="inline-flex min-w-[100px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-black text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            >
              <Circle size={13} /> Mesa redonda
            </button>

            <button
              onClick={() => addTable("square")}
              disabled={busy === "new-table-square"}
              className="inline-flex min-w-[100px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-black text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            >
              <Square size={13} /> Mesa cuadrada
            </button>

            <button
              onClick={() => addTable("rect")}
              disabled={busy === "new-table-rect"}
              className="inline-flex min-w-[110px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-black text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            >
              <RectangleHorizontal size={13} /> Mesa rectangular
            </button>

            {(
              ["wall", "door", "window", "bar", "entrance", "plant", "label"] as ReservationSpaceElementType[]
            ).map((type) => {
              const Icon = ELEMENT_ICONS[type];

              return (
                <button
                  key={type}
                  onClick={() => addElement(type)}
                  disabled={busy === `new-${type}`}
                  className="inline-flex min-w-[86px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-black text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
                >
                  <Icon size={13} />
                  {SPACE_ELEMENT_LABEL[type]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-black text-[#071B35]">Acciones del plano</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              disabled
              title="Disponible en una próxima mejora"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-300"
            >
              <Undo2 size={13} /> Deshacer
            </button>
            <button
              disabled
              title="Disponible en una próxima mejora"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-300"
            >
              <Redo2 size={13} /> Rehacer
            </button>
            <button
              onClick={() => setShowGrid((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black ${
                showGrid
                  ? "border-orange-200 bg-orange-50 text-orange-600"
                  : "border-slate-200 text-slate-500"
              }`}
            >
              <Grid3X3 size={13} /> Cuadrícula
            </button>
            <button
              onClick={() => setSnapToGrid((value) => !value)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black ${
                snapToGrid
                  ? "border-violet-200 bg-violet-50 text-violet-600"
                  : "border-slate-200 text-slate-500"
              }`}
              title="Cuando está activo, las posiciones se redondean al 1%"
            >
              <Grid3X3 size={13} /> Imán 1%
            </button>

            <button
              onClick={() => setZoom((value) => Math.max(75, value - 10))}
              className="rounded-xl border border-slate-200 p-2 text-slate-500"
            >
              <Minus size={13} />
            </button>

            <span className="flex items-center rounded-xl border border-slate-200 px-3 text-[10px] font-black text-slate-500">
              {zoom}%
            </span>

            <button
              onClick={() => setZoom((value) => Math.min(125, value + 10))}
              className="rounded-xl border border-slate-200 p-2 text-slate-500"
            >
              <Plus size={13} />
            </button>

            <button
              onClick={() => setZoom(100)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-500"
            >
              <Maximize2 size={13} /> Ajustar
            </button>
          </div>
        </div>
      </div>

      {/* Canvas + properties */}
      <div className="grid xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#071B35]">Plano del espacio</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Editando...
              </p>
            </div>
            <p className="text-[10px] font-semibold text-slate-400">
              Arrastre estable: toma el elemento desde cualquier punto y muévelo con precisión.
            </p>
          </div>

          <div className="overflow-auto rounded-[24px] border border-slate-200 bg-[#F7F3ED] p-3">
            <div
              ref={canvasRef}
              onClick={deselect}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => void finishCurrentDrag(e)}
              onPointerCancel={cancelCurrentDrag}
              className="relative mx-auto aspect-[16/10] min-h-[650px] min-w-[860px] touch-none overflow-hidden rounded-[20px] border-2 border-[#CDBEAD] bg-[#F3E8DA] shadow-inner"
              style={{
                width: `${zoom}%`,
                minWidth: `${Math.round(860 * (zoom / 100))}px`,
                minHeight: `${Math.round(650 * (zoom / 100))}px`,
                backgroundImage: showGrid
                  ? "linear-gradient(rgba(99,77,54,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(99,77,54,.055) 1px,transparent 1px)"
                  : "none",
                backgroundSize: "32px 32px",
              }}
            >
              {space.image_url && (
                <img
                  src={space.image_url}
                  alt=""
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[.035]"
                />
              )}

              {spaceElements.map((element) => {
                const Icon = ELEMENT_ICONS[element.element_type];
                const selected = element.id === selectedElementId;
                const livePosition = getElementPosition(element);

                const appearance =
                  element.element_type === "wall"
                    ? "border-none bg-[#302A26]"
                    : element.element_type === "window"
                    ? "border-2 border-sky-400 bg-sky-100"
                    : element.element_type === "bar"
                    ? "border border-amber-800 bg-amber-200"
                    : element.element_type === "plant"
                    ? "border-none bg-emerald-100"
                    : "border border-[#C8BAAA] bg-white/90";

                return (
                  <div
                    key={element.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectElement(element);
                    }}
                    onPointerDown={(e) => {
                      selectElement(element);
                      beginDrag(
                        e,
                        "element",
                        element.id,
                        livePosition.x,
                        livePosition.y
                      );
                    }}
                    className={`absolute flex cursor-grab items-center justify-center rounded-md shadow-sm active:cursor-grabbing ${appearance} ${
                      selected ? "ring-2 ring-orange-400 ring-offset-2" : ""
                    }`}
                    style={{
                      left: `${livePosition.x}%`,
                      top: `${livePosition.y}%`,
                      width: `${element.width}%`,
                      height: `${element.height}%`,
                      transform: `translate(-50%,-50%) rotate(${element.rotation}deg)`,
                    }}
                  >
                    {element.element_type !== "wall" && (
                      <Icon
                        size={14}
                        className={
                          element.element_type === "plant"
                            ? "text-emerald-600"
                            : "text-slate-500"
                        }
                      />
                    )}

                    {(element.element_type === "label" ||
                      element.element_type === "bar" ||
                      element.element_type === "entrance") && (
                      <span className="ml-1 truncate text-[9px] font-black uppercase tracking-wide text-slate-600">
                        {element.label}
                      </span>
                    )}
                  </div>
                );
              })}

              {spaceTables.map((table) => {
                const livePosition = getTablePosition(table);

                return (
                <div
                  key={table.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectTable(table);
                  }}
                  onPointerDown={(e) => {
                    selectTable(table);
                    beginDrag(
                      e,
                      "table",
                      table.id,
                      livePosition.x,
                      livePosition.y
                    );
                  }}
                  className="absolute cursor-grab select-none active:cursor-grabbing"
                  style={{
                    left: `${livePosition.x}%`,
                    top: `${livePosition.y}%`,
                    transform: `translate(-50%,-50%) rotate(${table.rotation || 0}deg)`,
                  }}
                >
                  <TableVisual
                    table={table}
                    selected={selectedTableId === table.id}
                    busy={busy === table.id}
                  />
                </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 px-4 py-3">
            <p className="text-[10px] font-semibold text-orange-800">
              Consejo: deja “Imán 1%” apagado para movimiento libre; actívalo solo cuando quieras alinear elementos.
            </p>
            <button
              onClick={() => setShowGrid((value) => !value)}
              className="text-[10px] font-black text-orange-600"
            >
              {showGrid ? "Ocultar cuadrícula" : "Ver cuadrícula"}
            </button>
          </div>
        </div>

        {/* Properties panel */}
        <aside className="border-t border-slate-100 bg-[#FBFCFE] p-4 xl:sticky xl:top-4 xl:h-fit xl:border-l xl:border-t-0">
          <p className="text-sm font-black text-[#071B35]">Propiedades del elemento</p>

          {!selectedElement && !selectedTable && (
            <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5">
              <p className="text-sm font-black text-slate-600">
                Selecciona un elemento
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                Haz clic sobre una mesa, pared, puerta, ventana, barra o texto. Este mensaje nunca tapa el plano.
              </p>
            </div>
          )}

          {selectedTable && tableDraft && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-[#071B35]">
                    {tableDraft.name}
                  </h3>
                  <span className="mt-1 inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-black text-orange-600">
                    {tableDraft.table_shape === "round"
                      ? "Mesa redonda"
                      : tableDraft.table_shape === "square"
                      ? "Mesa cuadrada"
                      : "Mesa rectangular"}
                  </span>
                </div>

                <button
                  onClick={removeSelectedTable}
                  className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-4 flex border-b border-slate-100">
                <button
                  onClick={() => setPropertiesTab("general")}
                  className={`flex-1 border-b-2 px-2 py-2 text-[10px] font-black ${
                    propertiesTab === "general"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  General
                </button>
                <button
                  onClick={() => setPropertiesTab("position")}
                  className={`flex-1 border-b-2 px-2 py-2 text-[10px] font-black ${
                    propertiesTab === "position"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  Posición
                </button>
              </div>

              {propertiesTab === "general" ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-[10px] font-black uppercase text-slate-400">
                    Nombre de la mesa
                    <input
                      value={tableDraft.name}
                      onChange={(e) =>
                        setTableDraft({ ...tableDraft, name: e.target.value })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-300"
                    />
                  </label>

                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">
                      Capacidad
                    </p>
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        onClick={() =>
                          setTableDraft({
                            ...tableDraft,
                            capacity: Math.max(1, tableDraft.capacity - 1),
                          })
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center text-sm font-black">
                        {tableDraft.capacity}
                      </span>
                      <button
                        onClick={() =>
                          setTableDraft({
                            ...tableDraft,
                            capacity: Math.min(20, tableDraft.capacity + 1),
                          })
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200"
                      >
                        <Plus size={13} />
                      </button>
                      <span className="text-xs font-semibold text-slate-400">
                        personas
                      </span>
                    </div>
                  </div>

                  <label className="block text-[10px] font-black uppercase text-slate-400">
                    Forma
                    <select
                      value={tableDraft.table_shape}
                      onChange={(e) =>
                        setTableDraft({
                          ...tableDraft,
                          table_shape: e.target.value as TableShape,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold"
                    >
                      <option value="round">Redonda</option>
                      <option value="square">Cuadrada</option>
                      <option value="rect">Rectangular</option>
                    </select>
                  </label>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      X %
                      <input
                        type="number"
                        min={3}
                        max={97}
                        value={tableDraft.pos_x}
                        onChange={(e) =>
                          setTableDraft({
                            ...tableDraft,
                            pos_x: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                      />
                    </label>
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      Y %
                      <input
                        type="number"
                        min={3}
                        max={97}
                        value={tableDraft.pos_y}
                        onChange={(e) =>
                          setTableDraft({
                            ...tableDraft,
                            pos_y: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                      />
                    </label>
                  </div>

                  <label className="block text-[10px] font-black uppercase text-slate-400">
                    Rotación
                    <div className="mt-1 flex gap-2">
                      <input
                        type="number"
                        value={tableDraft.rotation}
                        onChange={(e) =>
                          setTableDraft({
                            ...tableDraft,
                            rotation: Number(e.target.value),
                          })
                        }
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                      />
                      <button
                        onClick={() =>
                          setTableDraft({
                            ...tableDraft,
                            rotation: (tableDraft.rotation + 90) % 360,
                          })
                        }
                        className="rounded-xl border border-slate-200 px-3 text-slate-500"
                      >
                        <RotateCw size={14} />
                      </button>
                    </div>
                  </label>
                </div>
              )}

              <button
                onClick={saveSelectedTable}
                disabled={busy === selectedTable.id}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                <Save size={14} />
                Guardar mesa
              </button>
            </div>
          )}

          {selectedElement && elementDraft && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-orange-600">
                    Elemento seleccionado
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#071B35]">
                    {SPACE_ELEMENT_LABEL[selectedElement.element_type]}
                  </h3>
                </div>

                <button
                  onClick={deselect}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="mt-4 flex border-b border-slate-100">
                <button
                  onClick={() => setPropertiesTab("general")}
                  className={`flex-1 border-b-2 px-2 py-2 text-[10px] font-black ${
                    propertiesTab === "general"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  General
                </button>
                <button
                  onClick={() => setPropertiesTab("position")}
                  className={`flex-1 border-b-2 px-2 py-2 text-[10px] font-black ${
                    propertiesTab === "position"
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-slate-400"
                  }`}
                >
                  Posición
                </button>
              </div>

              {propertiesTab === "general" ? (
                <div className="mt-4 space-y-3">
                  <label className="block text-[10px] font-black uppercase text-slate-400">
                    Texto / nombre
                    <input
                      value={elementDraft.label}
                      onChange={(e) =>
                        setElementDraft({
                          ...elementDraft,
                          label: e.target.value,
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold outline-none focus:border-orange-300"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-black uppercase text-slate-400">
                      Ancho %
                      <input
                        type="number"
                        value={elementDraft.width}
                        onChange={(e) =>
                          setElementDraft({
                            ...elementDraft,
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
                        value={elementDraft.height}
                        onChange={(e) =>
                          setElementDraft({
                            ...elementDraft,
                            height: Number(e.target.value),
                          })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                      />
                    </label>
                  </div>

                  <label className="block text-[10px] font-black uppercase text-slate-400">
                    Rotación
                    <div className="mt-1 flex gap-2">
                      <input
                        type="number"
                        value={elementDraft.rotation}
                        onChange={(e) =>
                          setElementDraft({
                            ...elementDraft,
                            rotation: Number(e.target.value),
                          })
                        }
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                      />
                      <button
                        onClick={() =>
                          setElementDraft({
                            ...elementDraft,
                            rotation: (elementDraft.rotation + 90) % 360,
                          })
                        }
                        className="rounded-xl border border-slate-200 px-3 text-slate-500"
                      >
                        <RotateCw size={14} />
                      </button>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-black uppercase text-slate-400">
                    X %
                    <input
                      type="number"
                      value={elementDraft.pos_x}
                      onChange={(e) =>
                        setElementDraft({
                          ...elementDraft,
                          pos_x: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />
                  </label>

                  <label className="text-[10px] font-black uppercase text-slate-400">
                    Y %
                    <input
                      type="number"
                      value={elementDraft.pos_y}
                      onChange={(e) =>
                        setElementDraft({
                          ...elementDraft,
                          pos_y: Number(e.target.value),
                        })
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />
                  </label>
                </div>
              )}

              <button
                onClick={saveSelectedElement}
                disabled={busy === selectedElement.id}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
              >
                <Save size={14} />
                Guardar cambios
              </button>

              <button
                onClick={() => duplicateElement(selectedElement)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600"
              >
                <Copy size={14} />
                Duplicar
              </button>

              <button
                onClick={removeSelectedElement}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-xs font-black text-red-600"
              >
                <Trash2 size={14} />
                Eliminar del plano
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Elements list */}
      <div className="border-t border-slate-100 p-5">
        <div className="mb-3">
          <h3 className="text-base font-black text-[#071B35]">
            Elementos del plano ({spaceTables.length + spaceElements.length})
          </h3>
          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
            Lista de todo lo que existe en el plano. Selecciona uno para editarlo.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Capacidad / Texto</th>
                <th className="px-4 py-3">Posición</th>
                <th className="px-4 py-3">Tamaño</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {spaceTables.map((table) => (
                <tr
                  key={table.id}
                  className={selectedTableId === table.id ? "bg-orange-50/60" : ""}
                >
                  <td className="px-4 py-3 font-bold text-slate-500">
                    {table.table_shape === "round"
                      ? "Mesa redonda"
                      : table.table_shape === "square"
                      ? "Mesa cuadrada"
                      : "Mesa rectangular"}
                  </td>
                  <td className="px-4 py-3 font-black text-slate-700">
                    {table.name}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-500">
                    {table.capacity} personas
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-400">
                    {Math.round(table.pos_x ?? 50)}%,{" "}
                    {Math.round(table.pos_y ?? 50)}%
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-400">—</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => selectTable(table)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-black text-slate-500"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}

              {spaceElements.map((element) => (
                <tr
                  key={element.id}
                  className={selectedElementId === element.id ? "bg-orange-50/60" : ""}
                >
                  <td className="px-4 py-3 font-bold text-slate-500">
                    {SPACE_ELEMENT_LABEL[element.element_type]}
                  </td>
                  <td className="px-4 py-3 font-black text-slate-700">
                    {element.label || "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-500">
                    {element.element_type === "label" ? element.label : "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-400">
                    {Math.round(element.pos_x)}%, {Math.round(element.pos_y)}%
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-400">
                    {Math.round(element.width)}% × {Math.round(element.height)}%
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => selectElement(element)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-black text-slate-500"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}

              {spaceTables.length === 0 && spaceElements.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-xs font-semibold text-slate-400"
                  >
                    El plano todavía está vacío.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
