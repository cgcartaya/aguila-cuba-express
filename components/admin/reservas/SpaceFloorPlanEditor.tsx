"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AirVent,
  AlertTriangle,
  Armchair,
  Circle,
  Copy,
  DoorOpen,
  Fan,
  Grid3X3,
  LayoutPanelTop,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  RectangleHorizontal,
  RotateCw,
  Save,
  Sofa,
  Square,
  Trash2,
  TreePine,
  Toilet,
  Footprints,
  Type,
  Undo2,
  Redo2,
  Users,
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
  SEAT_TYPE_LABEL,
  SPACE_ELEMENT_LABEL,
  type ReservationSpace,
  type ReservationSpaceElement,
  type ReservationSpaceElementType,
  type ReservationTable,
  type SeatType,
} from "@/lib/reservas/types";
import {
  CANVAS_SHAPE_LABEL,
  canvasAspectRatioCss,
  canvasBaseDimensions,
} from "@/lib/reservas/canvas-shapes";

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

const SEAT_TYPE_OPTIONS: SeatType[] = ["chairs", "sofa", "stools"];
const SEAT_TYPE_ICON: Record<SeatType, typeof Armchair> = {
  chairs: Armchair,
  sofa: Sofa,
  stools: Users,
};

// Deshacer/Rehacer: por ahora cubre posición, tamaño, rotación y
// propiedades de mesas/elementos (lo que se puede revertir con
// seguridad). Crear/eliminar no entra todavía — revertir un borrado
// implicaría recrear filas con nuevos IDs, lo cual puede desalinear
// reservas ya hechas contra esa mesa.
type TableSnapshot = {
  pos_x: number;
  pos_y: number;
  rotation: number;
  name: string;
  capacity: number;
  seat_type: SeatType;
  table_shape: TableShape;
};

type ElementSnapshot = {
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  rotation: number;
  label: string;
};

type HistoryEntry =
  | { kind: "table"; id: string; before: TableSnapshot; after: TableSnapshot }
  | { kind: "element"; id: string; before: ElementSnapshot; after: ElementSnapshot };

function tableSnapshotFrom(
  table: ReservationTable,
  overrides?: Partial<TableSnapshot>
): TableSnapshot {
  return {
    pos_x: overrides?.pos_x ?? Number(table.pos_x ?? 50),
    pos_y: overrides?.pos_y ?? Number(table.pos_y ?? 50),
    rotation: overrides?.rotation ?? (table.rotation || 0),
    name: overrides?.name ?? table.name,
    capacity: overrides?.capacity ?? table.capacity,
    seat_type: overrides?.seat_type ?? table.seat_type,
    table_shape: overrides?.table_shape ?? table.table_shape,
  };
}

function elementSnapshotFrom(
  element: ReservationSpaceElement,
  overrides?: Partial<ElementSnapshot>
): ElementSnapshot {
  return {
    pos_x: overrides?.pos_x ?? Number(element.pos_x),
    pos_y: overrides?.pos_y ?? Number(element.pos_y),
    width: overrides?.width ?? Number(element.width),
    height: overrides?.height ?? Number(element.height),
    rotation: overrides?.rotation ?? Number(element.rotation || 0),
    label: overrides?.label ?? (element.label || ""),
  };
}

const ELEMENT_ICONS: Record<ReservationSpaceElementType, typeof Square> = {
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
  restroom: { width: 10, height: 8, label: "Baño" },
  stool: { width: 4.5, height: 4.5, label: "Banqueta" },
  stairs: { width: 14, height: 8, label: "Escalera" },
  label: { width: 20, height: 5, label: "Texto" },
  wall_fan: { width: 4, height: 4, label: "Ventilador de pared" },
  floor_fan: { width: 3.5, height: 3.5, label: "Ventilador de pie" },
  split_ac: { width: 10, height: 3, label: "Split" },
};

function clamp(value: number, min = 3, max = 97) {
  return Math.max(min, Math.min(max, value));
}

// Tamaño real de cada mesa (en px, sobre el lienzo base antes del
// zoom) convertido a % de ancho/alto — para poder calcular
// solapamientos sin depender del zoom actual. baseWidth/baseHeight
// vienen de canvasBaseDimensions() según la forma elegida para el
// espacio (panorámico, cuadrado, alargado...).
function tableFootprintPct(
  table: ReservationTable,
  baseWidth: number,
  baseHeight: number
) {
  const isRect = table.table_shape === "rect";
  const widthPx = isRect ? 132 : 92;
  const heightPx = isRect ? 78 : 92;

  return {
    widthPct: (widthPx / baseWidth) * 100,
    heightPct: (heightPx / baseHeight) * 100,
  };
}

function findOverlappingTableIds(
  tablesWithPosition: { table: ReservationTable; x: number; y: number }[],
  baseWidth: number,
  baseHeight: number
) {
  const overlapping = new Set<string>();

  for (let i = 0; i < tablesWithPosition.length; i++) {
    for (let j = i + 1; j < tablesWithPosition.length; j++) {
      const a = tablesWithPosition[i];
      const b = tablesWithPosition[j];

      const aBox = tableFootprintPct(a.table, baseWidth, baseHeight);
      const bBox = tableFootprintPct(b.table, baseWidth, baseHeight);

      // Margen chico para no marcar mesas apenas rozándose por
      // redondeos de posición.
      const margin = 0.6;

      const overlapX =
        Math.abs(a.x - b.x) <
        aBox.widthPct / 2 + bBox.widthPct / 2 - margin;
      const overlapY =
        Math.abs(a.y - b.y) <
        aBox.heightPct / 2 + bBox.heightPct / 2 - margin;

      if (overlapX && overlapY) {
        overlapping.add(a.table.id);
        overlapping.add(b.table.id);
      }
    }
  }

  return overlapping;
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

// Dibujo simplificado de cada elemento (sin imágenes, todo con capas
// de CSS) para que se parezca a lo que realmente es en vez de ser
// solo un ícono genérico dentro de una caja de color.
function ElementArt({ type }: { type: ReservationSpaceElementType }) {
  switch (type) {
    case "plant":
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute h-[78%] w-[78%] rounded-full bg-emerald-200/80" />
          <span className="absolute left-[4%] top-[35%] h-[34%] w-[34%] rounded-full bg-emerald-500/80" />
          <span className="absolute right-[4%] top-[18%] h-[36%] w-[36%] rounded-full bg-emerald-400/90" />
          <span className="absolute bottom-[3%] right-[24%] h-[34%] w-[34%] rounded-full bg-emerald-600/70" />
          <TreePine size={20} className="relative z-10 text-emerald-800" />
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
        <div className="absolute inset-0 flex flex-col justify-center gap-[2px] px-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-[2px] w-full bg-slate-500/70" />
          ))}
        </div>
      );

    case "door":
    case "entrance":
      return (
        <div className="absolute inset-0">
          {/* hoja de la puerta, entreabierta */}
          <span className="absolute bottom-0 left-0 h-[88%] w-[9%] rounded-sm bg-[#8B6F52]" />
          {/* arco de barrido, truco de border-radius en una sola esquina */}
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
          {/* marco del vano */}
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
              <span
                key={i}
                className="h-[30%] w-[7%] rounded-full bg-amber-800/70"
              />
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
              style={{
                transform: `rotate(${deg}deg) translateY(-34%)`,
              }}
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

function TableVisual({
  table,
  selected,
  busy,
  overlapping,
}: {
  table: ReservationTable;
  selected: boolean;
  busy: boolean;
  overlapping: boolean;
}) {
  const isRound = table.table_shape === "round";
  const isRect = table.table_shape === "rect";
  const SeatIcon = SEAT_TYPE_ICON[table.seat_type];

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
      } ${
        overlapping
          ? "outline outline-2 outline-offset-2 outline-red-500"
          : ""
      }`}
    >
      {overlapping && (
        <span className="absolute -right-2 -top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-sm">
          <AlertTriangle size={12} />
        </span>
      )}

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
            <SeatIcon
              size={13}
              className={`mx-auto ${
                selected ? "text-orange-500" : "text-lime-700"
              }`}
            />
            <span className="mt-0.5 block max-w-[96px] truncate text-[12px] font-black text-[#071B35]">
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
        before: { x: number; y: number };
      }
    | null
  >(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [future, setFuture] = useState<HistoryEntry[]>([]);

  const pushHistory = (entry: HistoryEntry) => {
    setHistory((prev) => [...prev.slice(-49), entry]);
    setFuture([]);
  };

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
    seat_type: SeatType;
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
      seat_type: table.seat_type,
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
      x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
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

  const canvasBase = useMemo(
    () => canvasBaseDimensions(space.canvas_shape),
    [space.canvas_shape]
  );

  const overlappingTableIds = useMemo(() => {
    const withPosition = spaceTables.map((table) => {
      const pos =
        positionOverrides[getPositionKey("table", table.id)] || {
          x: Number(table.pos_x ?? 50),
          y: Number(table.pos_y ?? 50),
        };
      return { table, x: pos.x, y: pos.y };
    });

    return findOverlappingTableIds(
      withPosition,
      canvasBase.width,
      canvasBase.height
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceTables, positionOverrides, canvasBase]);

  const clampElementPosition = (
    element: ReservationSpaceElement,
    x: number,
    y: number,
    geometry?: {
      width?: number;
      height?: number;
      rotation?: number;
    }
  ) => {
    const width = Math.max(
      0.5,
      Number(geometry?.width ?? element.width)
    );
    const height = Math.max(
      0.5,
      Number(geometry?.height ?? element.height)
    );
    const rotation = Number(
      geometry?.rotation ?? element.rotation ?? 0
    );

    const radians = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(radians));
    const sin = Math.abs(Math.sin(radians));

    // Bounding box real después de aplicar la rotación.
    const halfBoundingWidth =
      (width * cos + height * sin) / 2;
    const halfBoundingHeight =
      (width * sin + height * cos) / 2;

    return {
      x: Math.max(
        halfBoundingWidth,
        Math.min(100 - halfBoundingWidth, x)
      ),
      y: Math.max(
        halfBoundingHeight,
        Math.min(100 - halfBoundingHeight, y)
      ),
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
      before: { x: currentX, y: currentY },
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

    const dragInfo = dragging;
    const key = getPositionKey(dragInfo.type, dragInfo.id);
    const current = positionOverrides[key];

    setDragging(null);

    if (!current) return;

    setBusy(dragInfo.id);

    if (dragInfo.type === "table") {
      const table = spaceTables.find((item) => item.id === dragInfo.id);
      if (table) {
        const { error } = await updateReservationTableVisualPosition(
          table.id,
          current.x,
          current.y,
          table.rotation || 0
        );

        if (error) {
          alert("No se pudo guardar la nueva posición de la mesa.");
        } else if (
          dragInfo.before.x !== current.x ||
          dragInfo.before.y !== current.y
        ) {
          pushHistory({
            kind: "table",
            id: table.id,
            before: tableSnapshotFrom(table, {
              pos_x: dragInfo.before.x,
              pos_y: dragInfo.before.y,
            }),
            after: tableSnapshotFrom(table, {
              pos_x: current.x,
              pos_y: current.y,
            }),
          });
        }
      }
    } else {
      const element = spaceElements.find((item) => item.id === dragInfo.id);
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
        } else if (
          dragInfo.before.x !== current.x ||
          dragInfo.before.y !== current.y
        ) {
          pushHistory({
            kind: "element",
            id: element.id,
            before: elementSnapshotFrom(element, {
              pos_x: dragInfo.before.x,
              pos_y: dragInfo.before.y,
            }),
            after: elementSnapshotFrom(element, {
              pos_x: current.x,
              pos_y: current.y,
            }),
          });
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
        seat_type: table.seat_type,
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

    const width = Math.max(2, Math.min(80, elementDraft.width || 2));
    const height = Math.max(2, Math.min(80, elementDraft.height || 2));
    const posX = clamp(elementDraft.pos_x);
    const posY = clamp(elementDraft.pos_y);
    const rotation = elementDraft.rotation || 0;

    const before = elementSnapshotFrom(selectedElement);

    setBusy(selectedElement.id);

    const { error } = await saveReservationSpaceElement(storeId, {
      id: selectedElement.id,
      space_id: selectedElement.space_id,
      element_type: selectedElement.element_type,
      label: elementDraft.label,
      pos_x: posX,
      pos_y: posY,
      width,
      height,
      rotation,
      sort_order: selectedElement.sort_order,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo guardar el elemento.");
      return;
    }

    pushHistory({
      kind: "element",
      id: selectedElement.id,
      before,
      after: {
        pos_x: posX,
        pos_y: posY,
        width,
        height,
        rotation,
        label: elementDraft.label,
      },
    });

    const clamped = clampElementPosition(
      selectedElement,
      elementDraft.pos_x,
      elementDraft.pos_y,
      {
        width: elementDraft.width,
        height: elementDraft.height,
        rotation: elementDraft.rotation,
      }
    );
    setLivePosition("element", selectedElement.id, clamped.x, clamped.y);

    onChange();
    pulseSaved();
  };

  const saveSelectedTable = async () => {
    if (!selectedTable || !tableDraft) return;

    const name = tableDraft.name.trim() || selectedTable.name;
    const capacity = Math.max(1, Math.min(20, tableDraft.capacity || 1));
    const posX = clamp(tableDraft.pos_x);
    const posY = clamp(tableDraft.pos_y);
    const rotation = tableDraft.rotation || 0;

    const before = tableSnapshotFrom(selectedTable);

    setBusy(selectedTable.id);

    const { error } = await saveReservationTable(storeId, {
      id: selectedTable.id,
      name,
      capacity,
      seat_type: tableDraft.seat_type,
      zone: space.name,
      space_id: space.id,
      pos_row: selectedTable.pos_row,
      pos_col: selectedTable.pos_col,
      pos_x: posX,
      pos_y: posY,
      rotation,
      table_shape: tableDraft.table_shape,
      is_active: selectedTable.is_active,
      sort_order: selectedTable.sort_order,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo guardar la mesa.");
      return;
    }

    pushHistory({
      kind: "table",
      id: selectedTable.id,
      before,
      after: {
        pos_x: posX,
        pos_y: posY,
        rotation,
        name,
        capacity,
        seat_type: tableDraft.seat_type,
        table_shape: tableDraft.table_shape,
      },
    });

    setLivePosition("table", selectedTable.id, clamp(posX, 4, 96), clamp(posY, 4, 96));

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

  const duplicateTable = async (table: ReservationTable) => {
    setBusy(`duplicate-${table.id}`);

    const nextNumber =
      spaceTables.reduce((max, item) => {
        const match = item.name.match(/(\d+)/);
        return match ? Math.max(max, Number(match[1])) : max;
      }, 0) + 1;

    const baseName = table.name.match(/^(.*?)\s*\d+\s*$/)?.[1]?.trim();
    const name = baseName ? `${baseName} ${nextNumber}` : `${table.name} (copia)`;

    const { data, error } = await saveReservationTable(storeId, {
      name,
      capacity: table.capacity,
      seat_type: table.seat_type,
      zone: space.name,
      space_id: space.id,
      pos_row: table.pos_row,
      pos_col: table.pos_col,
      pos_x: clamp(Number(table.pos_x ?? 50) + 4),
      pos_y: clamp(Number(table.pos_y ?? 50) + 4),
      rotation: table.rotation || 0,
      table_shape: table.table_shape,
      is_active: table.is_active,
      sort_order: spaceTables.length,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo duplicar la mesa.");
      return;
    }

    if (data?.id) {
      const created = data as ReservationTable;
      setSelectedTableId(created.id);
      setSelectedElementId(null);
      setPropertiesTab("general");
      setTableDraft({
        name: created.name,
        capacity: created.capacity,
        table_shape: created.table_shape,
        seat_type: created.seat_type,
        rotation: created.rotation || 0,
        pos_x: Number(created.pos_x ?? 50),
        pos_y: Number(created.pos_y ?? 50),
      });
    }

    onChange();
    pulseSaved();
  };

  const applyTableSnapshot = async (id: string, snap: TableSnapshot) => {
    const table = spaceTables.find((item) => item.id === id);
    if (!table) return false;

    setBusy(id);

    const { error } = await saveReservationTable(storeId, {
      id,
      name: snap.name,
      capacity: snap.capacity,
      seat_type: snap.seat_type,
      zone: space.name,
      space_id: table.space_id,
      pos_row: table.pos_row,
      pos_col: table.pos_col,
      pos_x: snap.pos_x,
      pos_y: snap.pos_y,
      rotation: snap.rotation,
      table_shape: snap.table_shape,
      is_active: table.is_active,
      sort_order: table.sort_order,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo deshacer/rehacer el cambio en la mesa.");
      return false;
    }

    setLivePosition("table", id, snap.pos_x, snap.pos_y);

    if (selectedTableId === id) {
      setTableDraft({
        name: snap.name,
        capacity: snap.capacity,
        table_shape: snap.table_shape,
        seat_type: snap.seat_type,
        rotation: snap.rotation,
        pos_x: snap.pos_x,
        pos_y: snap.pos_y,
      });
    }

    onChange();
    return true;
  };

  const applyElementSnapshot = async (id: string, snap: ElementSnapshot) => {
    const element = spaceElements.find((item) => item.id === id);
    if (!element) return false;

    setBusy(id);

    const { error } = await saveReservationSpaceElement(storeId, {
      id,
      space_id: element.space_id,
      element_type: element.element_type,
      label: snap.label,
      pos_x: snap.pos_x,
      pos_y: snap.pos_y,
      width: snap.width,
      height: snap.height,
      rotation: snap.rotation,
      sort_order: element.sort_order,
    });

    setBusy(null);

    if (error) {
      alert("No se pudo deshacer/rehacer el cambio en el elemento.");
      return false;
    }

    setLivePosition("element", id, snap.pos_x, snap.pos_y);

    if (selectedElementId === id) {
      setElementDraft({
        label: snap.label,
        width: snap.width,
        height: snap.height,
        rotation: snap.rotation,
        pos_x: snap.pos_x,
        pos_y: snap.pos_y,
      });
    }

    onChange();
    return true;
  };

  const undo = async () => {
    if (history.length === 0) return;
    const entry = history[history.length - 1];

    const ok =
      entry.kind === "table"
        ? await applyTableSnapshot(entry.id, entry.before)
        : await applyElementSnapshot(entry.id, entry.before);

    if (ok) {
      setHistory((prev) => prev.slice(0, -1));
      setFuture((prev) => [...prev, entry]);
      pulseSaved();
    }
  };

  const redo = async () => {
    if (future.length === 0) return;
    const entry = future[future.length - 1];

    const ok =
      entry.kind === "table"
        ? await applyTableSnapshot(entry.id, entry.after)
        : await applyElementSnapshot(entry.id, entry.after);

    if (ok) {
      setFuture((prev) => prev.slice(0, -1));
      setHistory((prev) => [...prev, entry]);
      pulseSaved();
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() !== "z") return;

      e.preventDefault();
      if (e.shiftKey) {
        void redo();
      } else {
        void undo();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, future, spaceTables, spaceElements]);

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
              ["wall", "door", "window", "bar", "entrance", "plant", "restroom", "stool", "stairs", "label", "wall_fan", "floor_fan", "split_ac"] as ReservationSpaceElementType[]
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
              onClick={() => void undo()}
              disabled={history.length === 0}
              title={
                history.length === 0
                  ? "No hay cambios para deshacer"
                  : "Deshacer (Ctrl+Z)"
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 disabled:text-slate-300"
            >
              <Undo2 size={13} /> Deshacer
            </button>
            <button
              onClick={() => void redo()}
              disabled={future.length === 0}
              title={
                future.length === 0
                  ? "No hay cambios para rehacer"
                  : "Rehacer (Ctrl+Shift+Z)"
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600 disabled:text-slate-300"
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
            <div className="text-right">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-500">
                {CANVAS_SHAPE_LABEL[space.canvas_shape || "panoramic"]}
              </span>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                Arrastre estable: toma el elemento desde cualquier punto y muévelo con precisión.
              </p>
            </div>
          </div>

          <div className="overflow-auto rounded-[24px] border border-slate-200 bg-[#F7F3ED] p-3">
            <div
              ref={canvasRef}
              onClick={deselect}
              onPointerMove={handlePointerMove}
              onPointerUp={(e) => void finishCurrentDrag(e)}
              onPointerCancel={cancelCurrentDrag}
              className="relative mx-auto touch-none overflow-hidden rounded-[20px] border-2 border-[#CDBEAD] bg-[#F3E8DA] shadow-inner"
              style={{
                width: `${zoom}%`,
                aspectRatio: canvasAspectRatioCss(space.canvas_shape),
                minWidth: `${Math.round(canvasBase.width * (zoom / 100))}px`,
                minHeight: `${Math.round(canvasBase.height * (zoom / 100))}px`,
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
                    ? "border-none bg-transparent"
                    : element.element_type === "restroom"
                    ? "border border-sky-300 bg-sky-50"
                    : element.element_type === "stool"
                    ? "border border-amber-800 bg-amber-100 rounded-full"
                    : element.element_type === "stairs"
                    ? "border border-slate-400 bg-slate-100"
                    : element.element_type === "wall_fan" ||
                      element.element_type === "floor_fan"
                    ? "border border-cyan-300 bg-cyan-50 rounded-full"
                    : element.element_type === "split_ac"
                    ? "border border-cyan-300 bg-cyan-50"
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
                    className={`absolute cursor-grab rounded-md shadow-sm active:cursor-grabbing ${appearance} ${
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
                    <ElementArt type={element.element_type} />

                    {element.element_type === "label" && (
                      <span className="absolute inset-0 flex items-center justify-center truncate px-1 text-[9px] font-black uppercase tracking-wide text-slate-600">
                        {element.label}
                      </span>
                    )}

                    {(element.element_type === "bar" ||
                      element.element_type === "entrance" ||
                      element.element_type === "restroom" ||
                      element.element_type === "stairs") && (
                      <span className="absolute inset-x-[4%] bottom-[4%] truncate rounded bg-white/75 px-1 text-center text-[8px] font-black uppercase tracking-wide text-slate-600">
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
                    overlapping={overlappingTableIds.has(table.id)}
                  />
                </div>
                );
              })}
            </div>
          </div>

          {overlappingTableIds.size > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle size={15} className="shrink-0 text-red-500" />
              <p className="text-[10px] font-semibold text-red-700">
                {overlappingTableIds.size === 1
                  ? "1 mesa se solapa con otra."
                  : `${overlappingTableIds.size} mesas se solapan entre sí.`}{" "}
                Sepáralas un poco para que el cliente las distinga en el plano.
              </p>
            </div>
          )}

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
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="inline-flex rounded-full bg-orange-50 px-2.5 py-1 text-[9px] font-black text-orange-600">
                      {tableDraft.table_shape === "round"
                        ? "Mesa redonda"
                        : tableDraft.table_shape === "square"
                        ? "Mesa cuadrada"
                        : "Mesa rectangular"}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black text-slate-500">
                      {SEAT_TYPE_LABEL[tableDraft.seat_type]}
                    </span>
                  </div>
                </div>

                <div className="flex shrink-0 gap-1.5">
                  <button
                    onClick={() => void duplicateTable(selectedTable)}
                    disabled={busy === `duplicate-${selectedTable.id}`}
                    title="Duplicar mesa"
                    className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-50"
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    onClick={removeSelectedTable}
                    className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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

                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">
                      Tipo de asiento
                    </p>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {SEAT_TYPE_OPTIONS.map((option) => {
                        const Icon = SEAT_TYPE_ICON[option];
                        const active = tableDraft.seat_type === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              setTableDraft({
                                ...tableDraft,
                                seat_type: option,
                              })
                            }
                            className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-black transition ${
                              active
                                ? "border-orange-300 bg-orange-50 text-orange-600"
                                : "border-slate-200 text-slate-500 hover:bg-slate-50"
                            }`}
                          >
                            <Icon size={16} />
                            {SEAT_TYPE_LABEL[option]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                    <span className="inline-flex items-center gap-1.5">
                      {(() => {
                        const SeatIcon = SEAT_TYPE_ICON[table.seat_type];
                        return <SeatIcon size={12} className="text-slate-400" />;
                      })()}
                      {table.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-500">
                    {table.capacity} personas ·{" "}
                    {SEAT_TYPE_LABEL[table.seat_type]}
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
