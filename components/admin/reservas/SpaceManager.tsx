"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Image as ImageIcon,
  Layers3,
  Loader2,
  MapPinned,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import SpaceFloorPlanEditor from "./SpaceFloorPlanEditor";
import SpaceImageUploader from "./SpaceImageUploader";

import {
  deleteReservationSpace,
  saveReservationSpace,
} from "@/lib/services/reservas";
import {
  SPACE_TYPE_LABEL,
  type ReservationSpace,
  type ReservationSpaceFormData,
  type ReservationSpaceType,
  type ReservationTable,
  type ReservationSpaceElement,
} from "@/lib/reservas/types";
import {
  CANVAS_SHAPE_LABEL,
  CANVAS_SHAPE_OPTIONS,
} from "@/lib/reservas/canvas-shapes";

type Props = {
  storeId: string;
  spaces: ReservationSpace[];
  tables: ReservationTable[];
  elements: ReservationSpaceElement[];
  onChange: () => void;
};

const EMPTY: ReservationSpaceFormData = {
  name: "",
  description: "",
  space_type: "indoor",
  floor_label: "",
  image_url: "",
  canvas_shape: "panoramic",
  is_active: true,
  sort_order: 0,
};

const TYPES = Object.entries(SPACE_TYPE_LABEL) as [
  ReservationSpaceType,
  string
][];

export default function SpaceManager({
  storeId,
  spaces,
  tables,
  elements,
  onChange,
}: Props) {
  const [editing, setEditing] =
    useState<ReservationSpaceFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [planSpaceId, setPlanSpaceId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    tables.forEach((table) => {
      if (table.space_id) map[table.space_id] = (map[table.space_id] || 0) + 1;
    });
    return map;
  }, [tables]);

  const create = () =>
    setEditing({ ...EMPTY, sort_order: spaces.length });

  const edit = (space: ReservationSpace) =>
    setEditing({
      id: space.id,
      name: space.name,
      description: space.description || "",
      space_type: space.space_type,
      floor_label: space.floor_label || "",
      image_url: space.image_url || "",
      canvas_shape: space.canvas_shape || "panoramic",
      is_active: space.is_active,
      sort_order: space.sort_order,
    });

  const save = async () => {
    if (!editing?.name.trim()) return;
    setSaving(true);
    const { error } = await saveReservationSpace(storeId, editing);
    setSaving(false);
    if (error) return alert("No se pudo guardar el espacio.");
    setEditing(null);
    onChange();
  };

  const remove = async (space: ReservationSpace) => {
    const total = counts[space.id] || 0;
    if (
      !confirm(
        total
          ? `Este espacio tiene ${total} mesas. Si lo eliminas, las mesas quedarán sin espacio asignado. ¿Continuar?`
          : `¿Eliminar "${space.name}"?`
      )
    ) return;

    const { error } = await deleteReservationSpace(space.id);
    if (error) return alert("No se pudo eliminar el espacio.");
    onChange();
  };

  const toggle = async (space: ReservationSpace) => {
    const { error } = await saveReservationSpace(storeId, {
      id: space.id,
      name: space.name,
      description: space.description || "",
      space_type: space.space_type,
      floor_label: space.floor_label || "",
      image_url: space.image_url || "",
      canvas_shape: space.canvas_shape || "panoramic",
      is_active: !space.is_active,
      sort_order: space.sort_order,
    });
    if (error) return alert("No se pudo actualizar el espacio.");
    onChange();
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-lg font-black text-[#071B35]">
            Espacios del restaurante
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Crea las áreas reales que luego verá el cliente al elegir dónde sentarse.
          </p>
        </div>

        {!editing && (
          <button
            onClick={create}
            className="inline-flex items-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-sm font-black text-white shadow-sm"
          >
            <Plus size={16} />
            Nuevo espacio
          </button>
        )}
      </div>

      {editing && (
        <div className="border-b border-slate-100 bg-[#FBFCFE] p-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-600">
                  Nombre del espacio
                  <input
                    autoFocus
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    placeholder="Ej: Salón principal"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
                  />
                </label>

                <label className="text-xs font-black text-slate-600">
                  Tipo
                  <select
                    value={editing.space_type}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        space_type: e.target.value as ReservationSpaceType,
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none"
                  >
                    {TYPES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-black text-slate-600 sm:col-span-2">
                  Nivel / referencia
                  <input
                    value={editing.floor_label}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        floor_label: e.target.value,
                      })
                    }
                    placeholder="Ej: Planta baja, 2do piso"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none"
                  />
                </label>

                <label className="text-xs font-black text-slate-600 sm:col-span-2">
                  Forma del lienzo
                  <select
                    value={editing.canvas_shape}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        canvas_shape: e.target.value as ReservationSpaceFormData["canvas_shape"],
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none"
                  >
                    {CANVAS_SHAPE_OPTIONS.map((shape) => (
                      <option key={shape} value={shape}>
                        {CANVAS_SHAPE_LABEL[shape]}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-[10px] font-semibold text-slate-400">
                    Elige la proporción que más se parezca a este salón real. Si la cambias después de colocar mesas, es normal que necesites reacomodarlas — el lienzo cambia de forma.
                  </span>
                </label>
              </div>

              <div className="mt-3">
                <SpaceImageUploader
                  value={editing.image_url}
                  onChange={(url) =>
                    setEditing({ ...editing, image_url: url })
                  }
                />
              </div>

              <label className="mt-3 block text-xs font-black text-slate-600">
                Descripción para el cliente
                <textarea
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      description: e.target.value,
                    })
                  }
                  placeholder="Ej: Ambiente climatizado, cerca de la barra y con vista a la entrada."
                  className="mt-1 min-h-[100px] w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
                />
              </label>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="relative h-40 bg-slate-100">
                {editing.image_url ? (
                  <img
                    src={editing.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <ImageIcon size={34} />
                  </div>
                )}
              </div>

              <div className="p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-orange-600">
                  Vista del cliente
                </p>
                <h3 className="mt-1 text-lg font-black text-[#071B35]">
                  {editing.name || "Nombre del espacio"}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {editing.floor_label ||
                    SPACE_TYPE_LABEL[editing.space_type]}
                </p>
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                  {editing.description ||
                    "Añade una descripción breve para ayudar al cliente a elegir."}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="inline-flex items-center gap-1 rounded-xl px-4 py-2.5 text-xs font-black text-slate-500"
            >
              <X size={14} /> Cancelar
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF641F] px-5 py-2.5 text-xs font-black text-white disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Guardar espacio
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
        {spaces.map((space) => (
          <article
            key={space.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative h-36 bg-slate-100">
              {space.image_url ? (
                <img
                  src={space.image_url}
                  alt={space.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-300">
                  <Building2 size={32} />
                </div>
              )}

              <span
                className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black ${
                  space.is_active
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {space.is_active ? "Visible" : "Oculto"}
              </span>
            </div>

            <div className="p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-orange-600">
                {SPACE_TYPE_LABEL[space.space_type]}
              </p>
              <h3 className="mt-1 text-base font-black text-[#071B35]">
                {space.name}
              </h3>

              <p className="mt-1 text-xs font-semibold text-slate-400">
                {space.floor_label || "Sin nivel indicado"} ·{" "}
                {counts[space.id] || 0} mesas
              </p>

              {space.description && (
                <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">
                  {space.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setPlanSpaceId(space.id)}
                  className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-black text-violet-600"
                >
                  Editar plano
                </button>
                <div className="flex items-center gap-1">
                <button
                  onClick={() => toggle(space)}
                  className="rounded-lg px-2.5 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-50"
                >
                  {space.is_active ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  onClick={() => edit(space)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-600"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => remove(space)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
                </div>
              </div>
            </div>
          </article>
        ))}

        {spaces.length === 0 && !editing && (
          <button
            onClick={create}
            className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-200 bg-orange-50/30 p-6 text-center"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <Plus size={20} />
            </span>
            <span className="mt-3 font-black text-[#071B35]">
              Crear primer espacio
            </span>
            <span className="mt-1 max-w-[220px] text-xs font-semibold leading-5 text-slate-400">
              Salón principal, Terraza, Segundo piso, Patio, Bar...
            </span>
          </button>
        )}
      </div>

      {planSpaceId && (
        <div className="border-t border-slate-100 bg-[#F7F9FC] p-4 sm:p-5">
          {(() => {
            const currentSpace = spaces.find((space) => space.id === planSpaceId);
            if (!currentSpace) return null;

            return (
              <SpaceFloorPlanEditor
                storeId={storeId}
                space={currentSpace}
                tables={tables}
                elements={elements}
                onChange={onChange}
                onClose={() => setPlanSpaceId(null)}
              />
            );
          })()}
        </div>
      )}

      <div className="border-t border-slate-100 bg-gradient-to-r from-violet-50 to-white p-4">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
            <Sparkles size={16} />
          </div>
          <p className="text-xs font-semibold leading-5 text-slate-500">
            <strong className="text-slate-700">Tip:</strong> usa "Editar plano" en cada espacio para colocar mesas, paredes, puertas, ventanas y barra arrastrándolas directamente sobre el croquis.
          </p>
        </div>
      </div>
    </div>
  );
}
