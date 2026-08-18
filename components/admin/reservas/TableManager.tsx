"use client";

import { useMemo, useState } from "react";
import {
  Armchair,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
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
import { SEAT_TYPE_LABEL } from "@/lib/reservas/types";
import type {
  ReservationTable,
  ReservationTableFormData,
  SeatType,
} from "@/lib/reservas/types";
import MiniFloorPlanPreview from "./MiniFloorPlanPreview";

type Props = {
  storeId: string;
  tables: ReservationTable[];
  onChange: () => void;
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
  pos_row: 0,
  pos_col: 0,
  is_active: true,
  sort_order: 0,
};

export default function TableManager({
  storeId,
  tables,
  onChange,
}: Props) {
  const [editing, setEditing] =
    useState<ReservationTableFormData | null>(null);
  const [saving, setSaving] = useState(false);

  const knownZones = useMemo(
    () =>
      Array.from(
        new Set(
          tables
            .map((table) => (table.zone || "").trim())
            .filter(Boolean)
        )
      ),
    [tables]
  );

  const startCreate = () => {
    const maxRow = tables.reduce(
      (max, table) => Math.max(max, table.pos_row),
      -1
    );

    setEditing({
      ...EMPTY_FORM,
      zone: knownZones[0] || "",
      pos_row: maxRow + 1,
      sort_order: tables.length,
    });
  };

  const startEdit = (table: ReservationTable) => {
    setEditing({
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      seat_type: table.seat_type,
      zone: table.zone || "",
      pos_row: table.pos_row,
      pos_col: table.pos_col,
      is_active: table.is_active,
      sort_order: table.sort_order,
    });
  };

  const handleSave = async () => {
    if (!editing || !editing.name.trim() || editing.capacity < 1) return;

    setSaving(true);
    const { error } = await saveReservationTable(storeId, editing);
    setSaving(false);

    if (error) {
      alert("No se pudo guardar la mesa.");
      return;
    }

    setEditing(null);
    onChange();
  };

  const handleDelete = async (table: ReservationTable) => {
    if (
      !confirm(
        `¿Eliminar "${table.name}"? Esto también elimina sus reservas asociadas.`
      )
    ) {
      return;
    }

    const { error } = await deleteReservationTable(table.id);

    if (error) {
      alert("No se pudo eliminar la mesa.");
      return;
    }

    onChange();
  };

  const handleToggleActive = async (table: ReservationTable) => {
    const { error } = await saveReservationTable(storeId, {
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      seat_type: table.seat_type,
      zone: table.zone || "",
      pos_row: table.pos_row,
      pos_col: table.pos_col,
      is_active: !table.is_active,
      sort_order: table.sort_order,
    });

    if (error) {
      alert("No se pudo actualizar la mesa.");
      return;
    }

    onChange();
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
        <div>
          <h2 className="text-lg font-black text-[#071B35]">
            Espacios y mesas
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Configura capacidad, tipo de asiento y ubicación actual.
          </p>
        </div>

        {!editing && (
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#071B35] px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <Plus size={16} />
            Nueva mesa
          </button>
        )}
      </div>

      {knownZones.length > 0 && (
        <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
              <MapPinned size={12} />
              Zonas detectadas
            </span>

            {knownZones.map((zone) => (
              <span
                key={zone}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-600"
              >
                {zone}
              </span>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div className="border-b border-slate-100 bg-[#FBFCFE] p-5">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[.12em] text-orange-600">
              {editing.id ? "Editar mesa" : "Nueva mesa"}
            </p>
            <h3 className="mt-1 text-xl font-black text-[#071B35]">
              Define cómo verá el cliente esta mesa
            </h3>
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-600">
                  Nombre
                  <input
                    autoFocus
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    placeholder="Ej: Mesa 4, Sofá A"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
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
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
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
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
                  >
                    {SEAT_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {SEAT_TYPE_LABEL[type]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-xs font-black text-slate-600">
                  Espacio / zona
                  <input
                    value={editing.zone}
                    onChange={(e) =>
                      setEditing({ ...editing, zone: e.target.value })
                    }
                    placeholder="Ej: Salón principal, Terraza"
                    list="reservation-zones"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
                  />
                  <datalist id="reservation-zones">
                    {knownZones.map((zone) => (
                      <option key={zone} value={zone} />
                    ))}
                  </datalist>
                </label>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-600">
                  Posición actual en el croquis
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                  Esta cuadrícula es temporal. En la próxima fase se
                  sustituirá por un editor visual arrastrable.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="grid grid-cols-3 gap-1">
                    <span />
                    <button
                      onClick={() =>
                        setEditing({
                          ...editing,
                          pos_row: Math.max(0, editing.pos_row - 1),
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <span />

                    <button
                      onClick={() =>
                        setEditing({
                          ...editing,
                          pos_col: Math.max(0, editing.pos_col - 1),
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm"
                    >
                      <ArrowLeft size={14} />
                    </button>

                    <span className="flex items-center justify-center text-[10px] font-black text-slate-400">
                      {editing.pos_row},{editing.pos_col}
                    </span>

                    <button
                      onClick={() =>
                        setEditing({
                          ...editing,
                          pos_col: editing.pos_col + 1,
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm"
                    >
                      <ArrowRight size={14} />
                    </button>

                    <span />
                    <button
                      onClick={() =>
                        setEditing({
                          ...editing,
                          pos_row: editing.pos_row + 1,
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <span />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                Vista previa
              </p>
              <div className="mt-3">
                <MiniFloorPlanPreview
                  tables={tables}
                  editing={{
                    id: editing.id,
                    name: editing.name || "Nueva",
                    seat_type: editing.seat_type,
                    pos_row: editing.pos_row,
                    pos_col: editing.pos_col,
                  }}
                />
              </div>

              <div className="mt-4 rounded-xl bg-orange-50 px-3 py-2.5 text-[10px] font-semibold leading-4 text-orange-800">
                Después podrás diseñar cada espacio con paredes,
                puertas, ventanas, barra y mesas arrastrables.
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF641F] px-5 py-2.5 text-xs font-black text-white shadow-sm disabled:opacity-60"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Guardar mesa
            </button>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        {tables.length === 0 && !editing ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
            <Armchair size={30} className="mx-auto text-slate-300" />
            <h3 className="mt-3 font-black text-slate-700">
              Aún no hay mesas
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Crea la primera mesa para empezar a construir el espacio.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {tables.map((table) => {
              const Icon = SEAT_TYPE_ICON[table.seat_type];

              return (
                <div
                  key={table.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                      <Icon size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-[#071B35]">
                          {table.name}
                        </p>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                            table.is_active
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-400"
                          }`}
                        >
                          {table.is_active ? "Visible" : "Oculta"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {table.capacity} personas ·{" "}
                        {SEAT_TYPE_LABEL[table.seat_type]}
                      </p>

                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500">
                        <MapPinned size={11} />
                        {table.zone || "Sin zona"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-1 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => handleToggleActive(table)}
                      className="rounded-lg px-2.5 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-50"
                    >
                      {table.is_active ? "Ocultar" : "Mostrar"}
                    </button>

                    <button
                      onClick={() => startEdit(table)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-orange-50 hover:text-orange-600"
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(table)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
