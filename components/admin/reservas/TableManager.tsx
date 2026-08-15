"use client";

import { useState } from "react";
import {
  Armchair,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Sofa,
  Trash2,
  Users,
} from "lucide-react";

import { deleteReservationTable, saveReservationTable } from "@/lib/services/reservas";
import { SEAT_TYPE_LABEL } from "@/lib/reservas/types";
import type { ReservationTable, ReservationTableFormData, SeatType } from "@/lib/reservas/types";
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

export default function TableManager({ storeId, tables, onChange }: Props) {
  const [editing, setEditing] = useState<ReservationTableFormData | null>(null);
  const [saving, setSaving] = useState(false);

  const startCreate = () => {
    // Coloca la mesa nueva un renglón debajo de la última, como
    // punto de partida razonable — el admin ajusta la posición con
    // las flechas si quiere otro lugar exacto en el croquis.
    const maxRow = tables.reduce((max, t) => Math.max(max, t.pos_row), -1);
    setEditing({ ...EMPTY_FORM, pos_row: maxRow + 1, sort_order: tables.length });
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
    const confirmDelete = confirm(
      `¿Eliminar "${table.name}"? Esto también elimina sus reservas asociadas.`
    );
    if (!confirmDelete) return;

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
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Mesas</h2>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            Capacidad, tipo de asiento y posición en el croquis que verán los
            clientes al reservar.
          </p>
        </div>
        {!editing && (
          <button
            onClick={startCreate}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
          >
            <Plus size={14} />
            Mesa
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-600">
              Nombre
              <input
                autoFocus
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Ej: Mesa 4, Sofá A"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
              />
            </label>

            <label className="text-xs font-bold text-slate-600">
              Capacidad (personas)
              <input
                type="number"
                min={1}
                max={40}
                value={editing.capacity}
                onChange={(e) =>
                  setEditing({ ...editing, capacity: Number(e.target.value) || 1 })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
              />
            </label>

            <label className="text-xs font-bold text-slate-600">
              Tipo de asiento
              <select
                value={editing.seat_type}
                onChange={(e) =>
                  setEditing({ ...editing, seat_type: e.target.value as SeatType })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
              >
                {SEAT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {SEAT_TYPE_LABEL[type]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-slate-600">
              Zona (opcional)
              <input
                value={editing.zone}
                onChange={(e) => setEditing({ ...editing, zone: e.target.value })}
                placeholder="Ej: Terraza, Salón, Bar"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
              />
            </label>
          </div>

          <div className="mt-3">
            <p className="text-xs font-bold text-slate-600">Posición en el croquis</p>
            <div className="mt-1 flex flex-wrap items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="grid grid-cols-3 gap-1">
                <span />
                <button
                  onClick={() => setEditing({ ...editing, pos_row: Math.max(0, editing.pos_row - 1) })}
                  className="rounded-lg bg-white p-1.5 text-slate-500 shadow-sm hover:bg-slate-100"
                >
                  <ArrowUp size={14} />
                </button>
                <span />
                <button
                  onClick={() => setEditing({ ...editing, pos_col: Math.max(0, editing.pos_col - 1) })}
                  className="rounded-lg bg-white p-1.5 text-slate-500 shadow-sm hover:bg-slate-100"
                >
                  <ArrowLeft size={14} />
                </button>
                <span className="flex items-center justify-center text-[10px] font-black text-slate-400">
                  {editing.pos_row},{editing.pos_col}
                </span>
                <button
                  onClick={() => setEditing({ ...editing, pos_col: editing.pos_col + 1 })}
                  className="rounded-lg bg-white p-1.5 text-slate-500 shadow-sm hover:bg-slate-100"
                >
                  <ArrowRight size={14} />
                </button>
                <span />
                <button
                  onClick={() => setEditing({ ...editing, pos_row: editing.pos_row + 1 })}
                  className="rounded-lg bg-white p-1.5 text-slate-500 shadow-sm hover:bg-slate-100"
                >
                  <ArrowDown size={14} />
                </button>
                <span />
              </div>
              <p className="text-[11px] font-semibold text-slate-400">
                Mueve la mesa por fila/columna del croquis. Evita que dos
                mesas queden en la misma casilla exacta.
              </p>
              </div>

              <div className="w-full sm:w-auto">
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
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Guardar mesa
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {tables.length === 0 && !editing && (
          <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-400">
            Aún no has agregado mesas.
          </p>
        )}

        {tables.map((table) => {
          const Icon = SEAT_TYPE_ICON[table.seat_type];
          return (
            <div
              key={table.id}
              className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                <Icon size={18} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-900">{table.name}</p>
                  {!table.is_active && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      Oculta
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  {table.capacity} personas · {SEAT_TYPE_LABEL[table.seat_type]}
                  {table.zone ? ` · ${table.zone}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleToggleActive(table)}
                  className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-white"
                  title={table.is_active ? "Ocultar mesa" : "Mostrar mesa"}
                >
                  {table.is_active ? "Ocultar" : "Mostrar"}
                </button>
                <button
                  onClick={() => startEdit(table)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-white"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(table)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
