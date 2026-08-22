"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  Armchair,
  Circle,
  Copy,
  DoorOpen,
  Grid3X3,
  LayoutPanelTop,
  Lock,
  Maximize2,
  Minus,
  Plus,
  RectangleHorizontal,
  Save,
  Square,
  Trash2,
  TreePine,
  Toilet,
  Type,
  Unlock,
  UserRound,
  Users,
  Wind,
  X,
} from "lucide-react";

import {
  deleteReservationSpaceElement,
  deleteReservationTable,
  saveReservationSpaceElement,
  saveReservationTable,
  updateReservationSpaceElementLocked,
  updateReservationSpaceElementVisualPosition,
  updateReservationTableLocked,
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

type ItemKey = `table:${string}` | `element:${string}`;
type TableShape = "round" | "square" | "rect";
type Position = { x: number; y: number };

const ELEMENTS: ReservationSpaceElementType[] = [
  "wall", "door", "window", "bar", "entrance", "plant", "restroom",
  "stool", "stairs", "label", "wall_fan", "floor_fan", "split_ac",
  "waiter", "waitress",
];

const DEFAULTS: Record<ReservationSpaceElementType, { width: number; height: number; label: string }> = {
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
  waiter: { width: 5.5, height: 8, label: "Mesero" },
  waitress: { width: 5.5, height: 8, label: "Mesera" },
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function keyOf(type: "table" | "element", id: string): ItemKey {
  return `${type}:${id}` as ItemKey;
}

function parseKey(key: ItemKey) {
  const [type, id] = key.split(":") as ["table" | "element", string];
  return { type, id };
}

function ElementArt({ type }: { type: ReservationSpaceElementType }) {
  if (type === "waiter" || type === "waitress") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`flex h-[46%] aspect-square items-center justify-center rounded-full ${
          type === "waitress" ? "bg-fuchsia-100 text-fuchsia-700" : "bg-blue-100 text-blue-700"
        }`}>
          <UserRound size={18} />
        </span>
        <span className={`mt-[4%] h-[36%] w-[62%] rounded-t-xl ${
          type === "waitress" ? "bg-fuchsia-300" : "bg-blue-300"
        }`} />
      </div>
    );
  }
  if (type === "plant") return <div className="absolute inset-0 flex items-center justify-center text-emerald-700"><TreePine size={22}/></div>;
  if (type === "restroom") return <div className="absolute inset-0 flex items-center justify-center text-sky-700"><Toilet size={20}/></div>;
  if (type === "door" || type === "entrance") return <div className="absolute inset-0 flex items-center justify-center text-amber-800"><DoorOpen size={20}/></div>;
  if (type === "window") return <div className="absolute inset-0 flex items-center justify-center text-sky-600"><Wind size={20}/></div>;
  if (type === "bar") return <div className="absolute inset-0 flex items-center justify-center text-amber-800"><LayoutPanelTop size={20}/></div>;
  if (type === "label") return <div className="absolute inset-0 flex items-center justify-center text-slate-600"><Type size={18}/></div>;
  return null;
}

function TableVisual({ table, selected, locked }: { table: ReservationTable; selected: boolean; locked: boolean }) {
  const shape =
    table.table_shape === "round" ? "rounded-full h-[88px] w-[88px]" :
    table.table_shape === "rect" ? "rounded-2xl h-[74px] w-[126px]" :
    "rounded-2xl h-[88px] w-[88px]";
  return (
    <div className={`relative flex items-center justify-center border-2 shadow-md ${shape} ${
      selected ? "border-orange-500 bg-orange-100 ring-2 ring-orange-200" : "border-lime-600 bg-lime-100"
    }`}>
      {locked && <Lock size={12} className="absolute right-2 top-2 text-slate-500" />}
      <div className="text-center">
        <Armchair size={14} className="mx-auto text-lime-700"/>
        <div className="mt-1 text-[11px] font-black text-[#071B35]">{table.name}</div>
        <div className="text-[9px] font-bold text-slate-500">{table.capacity} personas</div>
      </div>
    </div>
  );
}

export default function SpaceFloorPlanEditor({
  storeId, space, tables, elements, onChange, onClose,
}: Props) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<Set<ItemKey>>(new Set());
  const [positions, setPositions] = useState<Record<ItemKey, Position>>({} as Record<ItemKey, Position>);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const spaceTables = useMemo(() => tables.filter(t => t.space_id === space.id), [tables, space.id]);
  const spaceElements = useMemo(() => elements.filter(e => e.space_id === space.id), [elements, space.id]);

  const [drag, setDrag] = useState<null | {
    pointerId: number;
    anchor: ItemKey;
    startPointer: Position;
    starts: Record<ItemKey, Position>;
  }>(null);

  const [tableDraft, setTableDraft] = useState<ReservationTable | null>(null);
  const [elementDraft, setElementDraft] = useState<ReservationSpaceElement | null>(null);

  const pulse = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1000);
  };

  const getPos = (key: ItemKey): Position => {
    if (positions[key]) return positions[key];
    const { type, id } = parseKey(key);
    if (type === "table") {
      const t = spaceTables.find(x => x.id === id);
      return { x: Number(t?.pos_x ?? 50), y: Number(t?.pos_y ?? 50) };
    }
    const e = spaceElements.find(x => x.id === id);
    return { x: Number(e?.pos_x ?? 50), y: Number(e?.pos_y ?? 50) };
  };

  const isLocked = (key: ItemKey) => {
    const { type, id } = parseKey(key);
    return type === "table"
      ? !!spaceTables.find(t => t.id === id)?.is_locked
      : !!spaceElements.find(e => e.id === id)?.is_locked;
  };

  const clampElement = (element: ReservationSpaceElement, x: number, y: number) => {
    const rad = (Number(element.rotation || 0) * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const halfW = (Number(element.width) * cos + Number(element.height) * sin) / 2;
    const halfH = (Number(element.width) * sin + Number(element.height) * cos) / 2;
    return { x: clamp(x, halfW, 100 - halfW), y: clamp(y, halfH, 100 - halfH) };
  };

  const clampItem = (key: ItemKey, p: Position) => {
    const { type, id } = parseKey(key);
    if (type === "table") return { x: clamp(p.x, 4, 96), y: clamp(p.y, 4, 96) };
    const element = spaceElements.find(e => e.id === id);
    return element ? clampElement(element, p.x, p.y) : p;
  };

  const point = (clientX: number, clientY: number): Position => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 50, y: 50 };
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  const choose = (key: ItemKey, additive: boolean) => {
    if (additive) {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
      setTableDraft(null); setElementDraft(null);
      return;
    }
    setSelected(new Set([key]));
    const { type, id } = parseKey(key);
    if (type === "table") {
      const t = spaceTables.find(x => x.id === id);
      setTableDraft(t ? { ...t } : null); setElementDraft(null);
    } else {
      const e = spaceElements.find(x => x.id === id);
      setElementDraft(e ? { ...e } : null); setTableDraft(null);
    }
  };

  const beginDrag = (ev: React.PointerEvent, key: ItemKey) => {
    ev.stopPropagation();
    if (isLocked(key)) return;
    const additive = ev.ctrlKey || ev.metaKey || ev.shiftKey;

    let moving = new Set(selected);
    if (additive) {
      choose(key, true);
      return;
    }
    if (!moving.has(key)) {
      moving = new Set([key]);
      choose(key, false);
    }
    const starts = {} as Record<ItemKey, Position>;
    moving.forEach(k => { if (!isLocked(k)) starts[k] = getPos(k); });
    if (!Object.keys(starts).length) return;

    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    setDrag({ pointerId: ev.pointerId, anchor: key, startPointer: point(ev.clientX, ev.clientY), starts });
  };

  const moveDrag = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const now = point(ev.clientX, ev.clientY);
    let dx = now.x - drag.startPointer.x;
    let dy = now.y - drag.startPointer.y;
    if (snap) { dx = Math.round(dx); dy = Math.round(dy); }

    setPositions(prev => {
      const next = { ...prev };
      (Object.keys(drag.starts) as ItemKey[]).forEach(key => {
        const start = drag.starts[key];
        let p = { x: start.x + dx, y: start.y + dy };
        if (snap) p = { x: Math.round(p.x), y: Math.round(p.y) };
        next[key] = clampItem(key, p);
      });
      return next;
    });
  };

  const persistKeys = async (keys: ItemKey[]) => {
    await Promise.all(keys.map(async key => {
      const { type, id } = parseKey(key);
      const p = clampItem(key, getPos(key));
      if (type === "table") {
        const t = spaceTables.find(x => x.id === id);
        if (t) await updateReservationTableVisualPosition(id, p.x, p.y, t.rotation || 0);
      } else {
        const e = spaceElements.find(x => x.id === id);
        if (e) await updateReservationSpaceElementVisualPosition(id, p.x, p.y, e.rotation || 0);
      }
    }));
  };

  const endDrag = async (ev: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || ev.pointerId !== drag.pointerId) return;
    const keys = Object.keys(drag.starts) as ItemKey[];
    setDrag(null);
    setBusy(true);
    await persistKeys(keys);
    setBusy(false);
    onChange();
    pulse();
  };

  const align = async (mode: "left"|"hcenter"|"right"|"top"|"vcenter"|"bottom") => {
    const keys = [...selected].filter(k => !isLocked(k));
    if (keys.length < 2) return;
    const ps = keys.map(k => getPos(k));
    const xs = ps.map(p => p.x), ys = ps.map(p => p.y);
    const targetX = mode === "left" ? Math.min(...xs) : mode === "right" ? Math.max(...xs) : (Math.min(...xs)+Math.max(...xs))/2;
    const targetY = mode === "top" ? Math.min(...ys) : mode === "bottom" ? Math.max(...ys) : (Math.min(...ys)+Math.max(...ys))/2;
    setPositions(prev => {
      const next = {...prev};
      keys.forEach(k => {
        const p = getPos(k);
        next[k] = clampItem(k, {
          x: ["left","hcenter","right"].includes(mode) ? targetX : p.x,
          y: ["top","vcenter","bottom"].includes(mode) ? targetY : p.y,
        });
      });
      return next;
    });
    await new Promise(r => setTimeout(r, 0));
    setBusy(true);
    await Promise.all(keys.map(async k => {
      const p = clampItem(k, {
        x: ["left","hcenter","right"].includes(mode) ? targetX : getPos(k).x,
        y: ["top","vcenter","bottom"].includes(mode) ? targetY : getPos(k).y,
      });
      const {type,id}=parseKey(k);
      if(type==="table"){ const t=spaceTables.find(x=>x.id===id); if(t) await updateReservationTableVisualPosition(id,p.x,p.y,t.rotation||0);}
      else { const e=spaceElements.find(x=>x.id===id); if(e) await updateReservationSpaceElementVisualPosition(id,p.x,p.y,e.rotation||0);}
    }));
    setBusy(false); onChange(); pulse();
  };

  const toggleLock = async (locked: boolean) => {
    const keys = [...selected];
    setBusy(true);
    await Promise.all(keys.map(k => {
      const {type,id}=parseKey(k);
      return type==="table" ? updateReservationTableLocked(id,locked) : updateReservationSpaceElementLocked(id,locked);
    }));
    setBusy(false); onChange(); pulse();
  };

  const removeSelection = async () => {
    const keys = [...selected];
    if (!keys.length || !confirm(`¿Eliminar ${keys.length} elemento(s) seleccionado(s)?`)) return;
    setBusy(true);
    await Promise.all(keys.map(k => {
      const {type,id}=parseKey(k);
      return type==="table" ? deleteReservationTable(id) : deleteReservationSpaceElement(id);
    }));
    setBusy(false); setSelected(new Set()); setTableDraft(null); setElementDraft(null); onChange(); pulse();
  };

  const duplicateSelection = async () => {
    const keys=[...selected].filter(k=>!isLocked(k));
    if(!keys.length) return;
    setBusy(true);
    for(const k of keys){
      const {type,id}=parseKey(k);
      if(type==="table"){
        const t=spaceTables.find(x=>x.id===id); if(!t) continue;
        await saveReservationTable(storeId,{
          name:`${t.name} copia`,capacity:t.capacity,seat_type:t.seat_type,zone:space.name,
          space_id:space.id,pos_row:t.pos_row,pos_col:t.pos_col,pos_x:clamp(Number(t.pos_x)+4,4,96),
          pos_y:clamp(Number(t.pos_y)+4,4,96),rotation:t.rotation||0,table_shape:t.table_shape,
          is_active:t.is_active,is_locked:false,sort_order:spaceTables.length+1
        });
      } else {
        const e=spaceElements.find(x=>x.id===id); if(!e) continue;
        const p=clampElement(e,Number(e.pos_x)+4,Number(e.pos_y)+4);
        await saveReservationSpaceElement(storeId,{
          space_id:space.id,element_type:e.element_type,label:e.label||"",pos_x:p.x,pos_y:p.y,
          width:e.width,height:e.height,rotation:e.rotation||0,is_locked:false,sort_order:spaceElements.length+1
        });
      }
    }
    setBusy(false); onChange(); pulse();
  };

  const addElement = async (type: ReservationSpaceElementType) => {
    const d=DEFAULTS[type]; setBusy(true);
    const {data}=await saveReservationSpaceElement(storeId,{
      space_id:space.id,element_type:type,label:d.label,pos_x:50,pos_y:50,width:d.width,height:d.height,
      rotation:0,is_locked:false,sort_order:spaceElements.length
    });
    setBusy(false);
    if(data?.id) setSelected(new Set([keyOf("element",data.id)]));
    onChange(); pulse();
  };

  const addTable = async (shape: TableShape) => {
    const n=spaceTables.reduce((m,t)=>Math.max(m,Number(t.name.match(/\d+/)?.[0]||0)),0)+1;
    setBusy(true);
    const {data}=await saveReservationTable(storeId,{
      name:`Mesa ${n}`,capacity:shape==="rect"?6:4,seat_type:"chairs",zone:space.name,space_id:space.id,
      pos_row:0,pos_col:0,pos_x:50,pos_y:50,rotation:0,table_shape:shape,is_active:true,is_locked:false,sort_order:spaceTables.length
    });
    setBusy(false);
    if(data?.id) setSelected(new Set([keyOf("table",data.id)]));
    onChange(); pulse();
  };

  const saveSingle = async () => {
    if(selected.size!==1) return;
    setBusy(true);
    if(tableDraft){
      const p={x:clamp(Number(tableDraft.pos_x),4,96),y:clamp(Number(tableDraft.pos_y),4,96)};
      await saveReservationTable(storeId,{...tableDraft,zone:space.name,space_id:space.id,pos_x:p.x,pos_y:p.y,is_locked:tableDraft.is_locked??false});
      setPositions(prev=>({...prev,[keyOf("table",tableDraft.id)]:p}));
    }
    if(elementDraft){
      const p=clampElement(elementDraft,Number(elementDraft.pos_x),Number(elementDraft.pos_y));
      await saveReservationSpaceElement(storeId,{...elementDraft,label:elementDraft.label||"",pos_x:p.x,pos_y:p.y,is_locked:elementDraft.is_locked??false});
      setPositions(prev=>({...prev,[keyOf("element",elementDraft.id)]:p}));
    }
    setBusy(false); onChange(); pulse();
  };

  useEffect(() => {
    const onKey=(e:KeyboardEvent)=>{
      const target=e.target as HTMLElement;
      if(["INPUT","TEXTAREA","SELECT"].includes(target.tagName)) return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="a"){e.preventDefault();setSelected(new Set([
        ...spaceTables.map(t=>keyOf("table",t.id)),...spaceElements.map(x=>keyOf("element",x.id))
      ]));}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="d"){e.preventDefault();void duplicateSelection();}
      if(e.key==="Delete"||e.key==="Backspace"){e.preventDefault();void removeSelection();}
      if(e.key==="Escape"){setSelected(new Set());setTableDraft(null);setElementDraft(null);}
    };
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  });

  const base=canvasBaseDimensions(space.canvas_shape);
  const selectedCount=selected.size;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_46px_rgba(15,23,42,.07)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-6">
        <div>
          <p className="text-[11px] font-bold text-slate-400">Espacios › {space.name} › <span className="text-orange-600">Editor profesional</span></p>
          <h2 className="mt-1 text-2xl font-black text-[#071B35] sm:text-3xl">Editor del plano</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">Ctrl/⌘ o Shift + clic para seleccionar varios. Arrastra cualquiera para mover el grupo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onClose&&<button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Salir</button>}
          <button onClick={()=>void saveSingle()} disabled={selectedCount!==1||busy} className="inline-flex items-center gap-2 rounded-xl bg-[#FF641F] px-4 py-2 text-xs font-black text-white disabled:opacity-40"><Save size={14}/> Guardar</button>
          <span className={`rounded-xl px-3 py-2 text-[10px] font-black ${saved?"bg-emerald-100 text-emerald-700":"bg-emerald-50 text-emerald-600"}`}>{saved?"Guardado":"Guardado automático"}</span>
        </div>
      </header>

      <div className="grid gap-4 border-b border-slate-100 bg-[#FBFCFE] p-4 xl:grid-cols-[1fr_430px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="text-xs font-black text-[#071B35]">Agregar</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={()=>addTable("round")} className="tool"><Circle size={13}/>Mesa redonda</button>
            <button onClick={()=>addTable("square")} className="tool"><Square size={13}/>Mesa cuadrada</button>
            <button onClick={()=>addTable("rect")} className="tool"><RectangleHorizontal size={13}/>Mesa rectangular</button>
            {ELEMENTS.map(type=><button key={type} onClick={()=>addElement(type)} className="tool"><Users size={13}/>{SPACE_ELEMENT_LABEL[type]}</button>)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-[#071B35]">Selección y alineación</p>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">{selectedCount} seleccionados</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="tool" disabled={!selectedCount} onClick={()=>duplicateSelection()}><Copy size={13}/>Duplicar</button>
            <button className="tool" disabled={!selectedCount} onClick={()=>toggleLock(true)}><Lock size={13}/>Bloquear</button>
            <button className="tool" disabled={!selectedCount} onClick={()=>toggleLock(false)}><Unlock size={13}/>Desbloquear</button>
            <button className="tool text-red-600" disabled={!selectedCount} onClick={()=>removeSelection()}><Trash2 size={13}/>Eliminar</button>
            <button className="iconTool" title="Alinear izquierda" disabled={selectedCount<2} onClick={()=>align("left")}><AlignStartVertical size={14}/></button>
            <button className="iconTool" title="Centrar horizontal" disabled={selectedCount<2} onClick={()=>align("hcenter")}><AlignCenterVertical size={14}/></button>
            <button className="iconTool" title="Alinear derecha" disabled={selectedCount<2} onClick={()=>align("right")}><AlignEndVertical size={14}/></button>
            <button className="iconTool" title="Alinear arriba" disabled={selectedCount<2} onClick={()=>align("top")}><AlignStartHorizontal size={14}/></button>
            <button className="iconTool" title="Centrar vertical" disabled={selectedCount<2} onClick={()=>align("vcenter")}><AlignCenterHorizontal size={14}/></button>
            <button className="iconTool" title="Alinear abajo" disabled={selectedCount<2} onClick={()=>align("bottom")}><AlignEndHorizontal size={14}/></button>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 p-3 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#071B35]">Plano del espacio</p>
              <p className="text-[10px] font-bold text-emerald-600">● Editando</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-500">{CANVAS_SHAPE_LABEL[space.canvas_shape||"panoramic"]}</span>
              <button className={`tool ${showGrid?"bg-orange-50 text-orange-600":""}`} onClick={()=>setShowGrid(v=>!v)}><Grid3X3 size={13}/>Cuadrícula</button>
              <button className={`tool ${snap?"bg-violet-50 text-violet-600":""}`} onClick={()=>setSnap(v=>!v)}><Grid3X3 size={13}/>Imán 1%</button>
              <button className="iconTool" onClick={()=>setZoom(z=>Math.max(70,z-10))}><Minus size={13}/></button>
              <span className="text-[10px] font-black text-slate-500">{zoom}%</span>
              <button className="iconTool" onClick={()=>setZoom(z=>Math.min(130,z+10))}><Plus size={13}/></button>
              <button className="iconTool" onClick={()=>setZoom(100)}><Maximize2 size={13}/></button>
            </div>
          </div>

          <div className="overflow-auto rounded-[24px] border border-slate-200 bg-[#F7F3ED] p-2 sm:p-3">
            <div
              ref={canvasRef}
              onClick={()=>{setSelected(new Set());setTableDraft(null);setElementDraft(null);}}
              onPointerMove={moveDrag}
              onPointerUp={(e)=>void endDrag(e)}
              onPointerCancel={()=>setDrag(null)}
              className="relative mx-auto touch-none overflow-hidden rounded-[20px] border-2 border-[#CDBEAD] bg-[#F3E8DA] shadow-inner"
              style={{
                width:`${zoom}%`,
                aspectRatio:canvasAspectRatioCss(space.canvas_shape),
                minWidth:`${Math.round(base.width*(zoom/100))}px`,
                minHeight:`${Math.round(base.height*(zoom/100))}px`,
                backgroundImage:showGrid?"linear-gradient(rgba(99,77,54,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(99,77,54,.055) 1px,transparent 1px)":"none",
                backgroundSize:"32px 32px"
              }}
            >
              {spaceElements.map(element=>{
                const key=keyOf("element",element.id), p=getPos(key), sel=selected.has(key), locked=!!element.is_locked;
                return <div key={element.id}
                  onClick={e=>{e.stopPropagation();choose(key,e.ctrlKey||e.metaKey||e.shiftKey)}}
                  onPointerDown={e=>beginDrag(e,key)}
                  className={`absolute rounded-md shadow-sm ${locked?"cursor-not-allowed opacity-80":"cursor-grab active:cursor-grabbing"} ${
                    sel?"ring-2 ring-orange-400 ring-offset-2":""
                  } ${element.element_type==="wall"?"bg-[#302A26]":element.element_type==="bar"?"bg-amber-200 border border-amber-700":element.element_type==="plant"?"bg-transparent":"border border-[#C8BAAA] bg-white/90"}`}
                  style={{left:`${p.x}%`,top:`${p.y}%`,width:`${element.width}%`,height:`${element.height}%`,transform:`translate(-50%,-50%) rotate(${element.rotation||0}deg)`}}>
                    {locked&&<Lock size={10} className="absolute right-1 top-1 z-10 text-slate-500"/>}
                    <ElementArt type={element.element_type}/>
                    {["label","bar","entrance","restroom","waiter","waitress"].includes(element.element_type)&&
                      <span className="absolute inset-x-0 bottom-0 truncate bg-white/75 px-1 text-center text-[7px] font-black uppercase text-slate-600">{element.label}</span>}
                  </div>
              })}
              {spaceTables.map(table=>{
                const key=keyOf("table",table.id), p=getPos(key);
                return <div key={table.id}
                  onClick={e=>{e.stopPropagation();choose(key,e.ctrlKey||e.metaKey||e.shiftKey)}}
                  onPointerDown={e=>beginDrag(e,key)}
                  className={`absolute select-none ${table.is_locked?"cursor-not-allowed":"cursor-grab active:cursor-grabbing"}`}
                  style={{left:`${p.x}%`,top:`${p.y}%`,transform:`translate(-50%,-50%) rotate(${table.rotation||0}deg)`}}>
                    <TableVisual table={table} selected={selected.has(key)} locked={!!table.is_locked}/>
                  </div>
              })}
            </div>
          </div>
          <p className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-[10px] font-semibold text-orange-800">
            PC: Ctrl/⌘ o Shift + clic para selección múltiple. Móvil/tablet: toca para seleccionar; los elementos bloqueados no se mueven. El plano se desplaza horizontalmente si no cabe.
          </p>
        </div>

        <aside className="border-t border-slate-100 bg-[#FBFCFE] p-4 xl:border-l xl:border-t-0">
          <div className="flex items-center justify-between"><p className="text-sm font-black text-[#071B35]">Propiedades</p>{selectedCount>0&&<button onClick={()=>{setSelected(new Set());setTableDraft(null);setElementDraft(null)}}><X size={15}/></button>}</div>
          {selectedCount===0&&<div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white p-5"><p className="text-sm font-black text-slate-600">Selecciona un elemento</p><p className="mt-1 text-xs font-semibold text-slate-400">Puedes seleccionar uno o varios.</p></div>}
          {selectedCount>1&&<div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4"><p className="font-black text-violet-800">{selectedCount} elementos seleccionados</p><p className="mt-1 text-xs font-semibold text-violet-600">Muévelos juntos o usa las acciones de alinear, duplicar, bloquear y eliminar.</p></div>}
          {selectedCount===1&&tableDraft&&<div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-[10px] font-black uppercase text-slate-400">Nombre<input className="field" value={tableDraft.name} onChange={e=>setTableDraft({...tableDraft,name:e.target.value})}/></label>
            <label className="block text-[10px] font-black uppercase text-slate-400">Capacidad<input className="field" type="number" min={1} max={20} value={tableDraft.capacity} onChange={e=>setTableDraft({...tableDraft,capacity:Number(e.target.value)})}/></label>
            <label className="block text-[10px] font-black uppercase text-slate-400">Forma<select className="field" value={tableDraft.table_shape} onChange={e=>setTableDraft({...tableDraft,table_shape:e.target.value as TableShape})}><option value="round">Redonda</option><option value="square">Cuadrada</option><option value="rect">Rectangular</option></select></label>
            <label className="block text-[10px] font-black uppercase text-slate-400">Asiento<select className="field" value={tableDraft.seat_type} onChange={e=>setTableDraft({...tableDraft,seat_type:e.target.value as SeatType})}>{(["chairs","sofa","stools"] as SeatType[]).map(x=><option key={x} value={x}>{SEAT_TYPE_LABEL[x]}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-black uppercase text-slate-400">X<input className="field" type="number" value={tableDraft.pos_x} onChange={e=>setTableDraft({...tableDraft,pos_x:Number(e.target.value)})}/></label><label className="text-[10px] font-black uppercase text-slate-400">Y<input className="field" type="number" value={tableDraft.pos_y} onChange={e=>setTableDraft({...tableDraft,pos_y:Number(e.target.value)})}/></label></div>
            <label className="block text-[10px] font-black uppercase text-slate-400">Rotación<input className="field" type="number" value={tableDraft.rotation} onChange={e=>setTableDraft({...tableDraft,rotation:Number(e.target.value)})}/></label>
            <button onClick={()=>void saveSingle()} className="w-full rounded-xl bg-[#071B35] px-4 py-3 text-xs font-black text-white">Guardar cambios</button>
          </div>}
          {selectedCount===1&&elementDraft&&<div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-[10px] font-black uppercase text-slate-400">Etiqueta<input className="field" value={elementDraft.label||""} onChange={e=>setElementDraft({...elementDraft,label:e.target.value})}/></label>
            <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-black uppercase text-slate-400">Ancho<input className="field" type="number" min={2} value={elementDraft.width} onChange={e=>setElementDraft({...elementDraft,width:Number(e.target.value)})}/></label><label className="text-[10px] font-black uppercase text-slate-400">Alto<input className="field" type="number" min={2} value={elementDraft.height} onChange={e=>setElementDraft({...elementDraft,height:Number(e.target.value)})}/></label></div>
            <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-black uppercase text-slate-400">X<input className="field" type="number" value={elementDraft.pos_x} onChange={e=>setElementDraft({...elementDraft,pos_x:Number(e.target.value)})}/></label><label className="text-[10px] font-black uppercase text-slate-400">Y<input className="field" type="number" value={elementDraft.pos_y} onChange={e=>setElementDraft({...elementDraft,pos_y:Number(e.target.value)})}/></label></div>
            <label className="block text-[10px] font-black uppercase text-slate-400">Rotación<input className="field" type="number" value={elementDraft.rotation} onChange={e=>setElementDraft({...elementDraft,rotation:Number(e.target.value)})}/></label>
            <button onClick={()=>void saveSingle()} className="w-full rounded-xl bg-[#071B35] px-4 py-3 text-xs font-black text-white">Guardar cambios</button>
          </div>}
        </aside>
      </div>

      <style jsx>{`
        .tool{display:inline-flex;align-items:center;justify-content:center;gap:.375rem;border:1px solid rgb(226 232 240);border-radius:.75rem;padding:.5rem .75rem;font-size:10px;font-weight:900;color:rgb(71 85 105);background:white}
        .tool:hover{background:rgb(248 250 252)}
        .tool:disabled,.iconTool:disabled{opacity:.35;cursor:not-allowed}
        .iconTool{display:inline-flex;height:32px;width:32px;align-items:center;justify-content:center;border:1px solid rgb(226 232 240);border-radius:.75rem;background:white;color:rgb(71 85 105)}
        .field{margin-top:.25rem;width:100%;border:1px solid rgb(226 232 240);border-radius:.75rem;padding:.625rem .75rem;font-size:12px;font-weight:700;outline:none}
        .field:focus{border-color:rgb(253 186 116)}
      `}</style>
    </section>
  );
}
