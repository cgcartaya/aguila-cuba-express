"use client";

import { useMemo, useState } from "react";
import {
  Armchair,
  ArrowUpRight,
  Loader2,
  MapPinned,
  Pencil,
  Plus,
  Sofa,
  Trash2,
  Users,
} from "lucide-react";

import {
  deleteReservationTable,
  saveReservationTable,
} from "@/lib/services/reservas";
import {
  SEAT_TYPE_LABEL,
  type ReservationSpace,
  type ReservationTable,
  type ReservationTableFormData,
  type SeatType,
} from "@/lib/reservas/types";

type Props = {
  storeId: string;
  tables: ReservationTable[];
  spaces: ReservationSpace[];
  onChange: () => void;
  onOpenSpaces?: () => void;
};

const SEAT_TYPE_OPTIONS: SeatType[] = ["chairs", "sofa", "stools"];
const SEAT_TYPE_ICON: Record<SeatType, typeof Armchair> = {
  chairs: Armchair,
  sofa: Sofa,
  stools: Users,
};

const EMPTY_FORM: ReservationTableFormData = {
  name: "",
  capacity: 4,
  seat_type: "chairs",
  zone: "",
  space_id: null,
  pos_row: 0,
  pos_col: 0,
  pos_x: 50,
  pos_y: 50,
  rotation: 0,
  table_shape: "round",
  is_active: true,
  sort_order: 0,
};

export default function TableManager({
  storeId,
  tables,
  spaces,
  onChange,
  onOpenSpaces,
}: Props) {
  const [editing, setEditing] =
    useState<ReservationTableFormData | null>(null);
  const [saving, setSaving] = useState(false);

  const spaceMap = useMemo(
    () => new Map(spaces.map((space) => [space.id, space])),
    [spaces]
  );

  const startCreate = () => {
    const firstSpace = spaces.find((space) => space.is_active) || spaces[0];
    setEditing({
      ...EMPTY_FORM,
      space_id: firstSpace?.id || null,
      zone: firstSpace?.name || "",
      sort_order: tables.length,
    });
  };

  const startEdit = (table: ReservationTable) =>
    setEditing({
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      seat_type: table.seat_type,
      zone: table.zone || "",
      space_id: table.space_id || null,
      pos_row: table.pos_row,
      pos_col: table.pos_col,
      pos_x: table.pos_x ?? 50,
      pos_y: table.pos_y ?? 50,
      rotation: table.rotation || 0,
      table_shape: table.table_shape || "round",
      is_active: table.is_active,
      sort_order: table.sort_order,
    });

  const selectSpace = (spaceId: string) => {
    if (!editing) return;
    const space = spaces.find((item) => item.id === spaceId);
    setEditing({
      ...editing,
      space_id: space?.id || null,
      zone: space?.name || "",
    });
  };

  const save = async () => {
    if (!editing || !editing.name.trim() || editing.capacity < 1) return;
    if (!editing.space_id) {
      alert("Selecciona un espacio para esta mesa.");
      return;
    }

    setSaving(true);
    const { error } = await saveReservationTable(storeId, editing);
    setSaving(false);

    if (error) return alert("No se pudo guardar la mesa.");
    setEditing(null);
    onChange();
  };

  const remove = async (table: ReservationTable) => {
    if (!confirm(`¿Eliminar "${table.name}"?`)) return;
    const { error } = await deleteReservationTable(table.id);
    if (error) return alert("No se pudo eliminar la mesa.");
    onChange();
  };

  const toggle = async (table: ReservationTable) => {
    const space = table.space_id ? spaceMap.get(table.space_id) : null;
    const { error } = await saveReservationTable(storeId, {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      seat_type: table.seat_type,
      zone: space?.name || table.zone || "",
      space_id: table.space_id || null,
      pos_row: table.pos_row,
      pos_col: table.pos_col,
      pos_x: table.pos_x ?? 50,
      pos_y: table.pos_y ?? 50,
      rotation: table.rotation || 0,
      table_shape: table.table_shape || "round",
      is_active: !table.is_active,
      sort_order: table.sort_order,
    });

    if (error) return alert("No se pudo actualizar la mesa.");
    onChange();
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-lg font-black text-[#071B35]">Mesas</h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Asigna cada mesa a un espacio real del restaurante. Para colocarla en el plano, usa "Espacios → Editar plano".
          </p>
        </div>

        {!editing && (
          <button
            onClick={startCreate}
            disabled={spaces.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-sm font-black text-white shadow-sm disabled:opacity-40"
          >
            <Plus size={16} /> Nueva mesa
          </button>
        )}
      </div>

      {spaces.length === 0 && (
        <div className="border-b border-orange-100 bg-orange-50 p-4 text-xs font-semibold text-orange-800">
          Primero crea al menos un espacio en la pestaña <strong>Espacios</strong>.
        </div>
      )}

      {editing && (
        <div className="border-b border-slate-100 bg-[#FBFCFE] p-5">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-black text-slate-600">
                Nombre
                <input
                  autoFocus
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="Ej: Mesa 4"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none"
                />
              </label>

              <label className="text-xs font-black text-slate-600">
                Capacidad
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={editing.capacity}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      capacity: Number(e.target.value) || 1,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold outline-none"
                />
              </label>

              <label className="text-xs font-black text-slate-600">
                Tipo de asiento
                <select
                  value={editing.seat_type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      seat_type: e.target.value as SeatType,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                >
                  {SEAT_TYPE_OPTIONS.map((type) => (
                    <option key={type} value={type}>
                      {SEAT_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-black text-slate-600">
                Forma de mesa
                <select
                  value={editing.table_shape}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      table_shape: e.target.value as "round" | "square" | "rect",
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                >
                  <option value="round">Redonda</option>
                  <option value="square">Cuadrada</option>
                  <option value="rect">Rectangular</option>
                </select>
              </label>

              <label className="text-xs font-black text-slate-600 sm:col-span-2">
                Espacio
                <select
                  value={editing.space_id || ""}
                  onChange={(e) => selectSpace(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold"
                >
                  <option value="">Selecciona un espacio</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>
                      {space.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-violet-50 px-3 py-2.5 text-xs font-semibold text-violet-700">
              <span>
                <MapPinned size={13} className="mr-1 inline" />
                La posición de la mesa dentro del plano se ajusta desde{" "}
                <strong>Espacios → Editar plano</strong>, no aquí.
              </span>
              {onOpenSpaces && (
                <button
                  onClick={() => {
                    setEditing(null);
                    onOpenSpaces();
                  }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-black text-violet-700 shadow-sm"
                >
                  Ir a Espacios <ArrowUpRight size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="mx-auto mt-4 flex max-w-2xl justify-end gap-2">
            <button onClick={() => setEditing(null)} className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-500">
              Cancelar
            </button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#FF641F] px-5 py-2.5 text-xs font-black text-white disabled:opacity-60">
              {saving && <Loader2 size={14} className="animate-spin"/>}
              Guardar mesa
            </button>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="space-y-6">
          {spaces.map((space) => {
            const list = tables.filter((table) => table.space_id === space.id);
            return (
              <section key={space.id}>
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-[#071B35]">{space.name}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{list.length} mesas</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {list.map((table) => {
                    const Icon = SEAT_TYPE_ICON[table.seat_type];
                    return (
                      <article key={table.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600"><Icon size={19}/></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-black text-[#071B35]">{table.name}</p>
                              <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${table.is_active?"bg-emerald-50 text-emerald-600":"bg-slate-100 text-slate-400"}`}>{table.is_active?"Visible":"Oculta"}</span>
                            </div>
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {table.capacity} personas · {SEAT_TYPE_LABEL[table.seat_type]}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-1 border-t border-slate-100 pt-3">
                          <button onClick={() => toggle(table)} className="rounded-lg px-2.5 py-1.5 text-[10px] font-black text-slate-500">{table.is_active?"Ocultar":"Mostrar"}</button>
                          <button onClick={() => startEdit(table)} className="rounded-lg border p-2 text-slate-500"><Pencil size={14}/></button>
                          <button onClick={() => remove(table)} className="rounded-lg border p-2 text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                        </div>
                      </article>
                    );
                  })}

                  {list.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center text-xs font-semibold text-slate-400">
                      Todavía no hay mesas en este espacio.
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
