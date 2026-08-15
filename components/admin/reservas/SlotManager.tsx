"use client";

import { useState } from "react";
import { Clock3, Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { deleteReservationSlot, saveReservationSlot } from "@/lib/services/reservas";
import { DAY_LABEL } from "@/lib/reservas/types";
import type { ReservationSlot, ReservationSlotFormData } from "@/lib/reservas/types";

type Props = {
  storeId: string;
  slots: ReservationSlot[];
  onChange: () => void;
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const EMPTY_FORM: ReservationSlotFormData = {
  label: "",
  start_time: "19:00",
  duration_minutes: 90,
  days_of_week: ALL_DAYS,
  is_active: true,
  sort_order: 0,
};

function formatTime(value: string) {
  // "19:00:00" -> "7:00 PM"
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function SlotManager({ storeId, slots, onChange }: Props) {
  const [editing, setEditing] = useState<ReservationSlotFormData | null>(null);
  const [saving, setSaving] = useState(false);

  const startCreate = () => {
    setEditing({ ...EMPTY_FORM, sort_order: slots.length });
  };

  const startEdit = (slot: ReservationSlot) => {
    setEditing({
      id: slot.id,
      label: slot.label,
      start_time: slot.start_time.slice(0, 5),
      duration_minutes: slot.duration_minutes,
      days_of_week: slot.days_of_week,
      is_active: slot.is_active,
      sort_order: slot.sort_order,
    });
  };

  const toggleDay = (day: number) => {
    if (!editing) return;
    const days = editing.days_of_week.includes(day)
      ? editing.days_of_week.filter((d) => d !== day)
      : [...editing.days_of_week, day].sort();
    setEditing({ ...editing, days_of_week: days });
  };

  const handleSave = async () => {
    if (!editing || !editing.label.trim() || editing.days_of_week.length === 0) return;
    setSaving(true);
    const { error } = await saveReservationSlot(storeId, editing);
    setSaving(false);
    if (error) {
      alert("No se pudo guardar la franja horaria.");
      return;
    }
    setEditing(null);
    onChange();
  };

  const handleDelete = async (slot: ReservationSlot) => {
    const confirmDelete = confirm(`¿Eliminar la franja "${slot.label}"?`);
    if (!confirmDelete) return;

    const { error } = await deleteReservationSlot(slot.id);
    if (error) {
      alert("No se pudo eliminar la franja.");
      return;
    }
    onChange();
  };

  const handleToggleActive = async (slot: ReservationSlot) => {
    const { error } = await saveReservationSlot(storeId, {
      id: slot.id,
      label: slot.label,
      start_time: slot.start_time.slice(0, 5),
      duration_minutes: slot.duration_minutes,
      days_of_week: slot.days_of_week,
      is_active: !slot.is_active,
      sort_order: slot.sort_order,
    });
    if (error) {
      alert("No se pudo actualizar la franja.");
      return;
    }
    onChange();
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
            Franjas horarias
          </h2>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
            Los horarios que el cliente puede elegir para reservar, y qué días
            de la semana aplican.
          </p>
        </div>
        {!editing && (
          <button
            onClick={startCreate}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
          >
            <Plus size={14} />
            Franja
          </button>
        )}
      </div>

      {editing && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold text-slate-600">
              Nombre
              <input
                autoFocus
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                placeholder="Ej: Cena 7:00pm"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
              />
            </label>

            <label className="text-xs font-bold text-slate-600">
              Hora de inicio
              <input
                type="time"
                value={editing.start_time}
                onChange={(e) => setEditing({ ...editing, start_time: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
              />
            </label>

            <label className="text-xs font-bold text-slate-600">
              Duración estimada (min)
              <input
                type="number"
                min={15}
                step={15}
                value={editing.duration_minutes}
                onChange={(e) =>
                  setEditing({ ...editing, duration_minutes: Number(e.target.value) || 90 })
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
              />
            </label>
          </div>

          <div className="mt-3">
            <p className="text-xs font-bold text-slate-600">Días activos</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ALL_DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                    editing.days_of_week.includes(day)
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-400"
                  }`}
                >
                  {DAY_LABEL[day]}
                </button>
              ))}
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
              Guardar franja
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {slots.length === 0 && !editing && (
          <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-400">
            Aún no has configurado franjas horarias.
          </p>
        )}

        {slots.map((slot) => (
          <div key={slot.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
              <Clock3 size={18} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-black text-slate-900">{slot.label}</p>
                {!slot.is_active && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                    Oculta
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-slate-500">
                {formatTime(slot.start_time)} · {slot.duration_minutes} min ·{" "}
                {slot.days_of_week.length === 7
                  ? "Todos los días"
                  : slot.days_of_week.map((d) => DAY_LABEL[d]).join(", ")}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => handleToggleActive(slot)}
                className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-white"
                title={slot.is_active ? "Ocultar franja" : "Mostrar franja"}
              >
                {slot.is_active ? "Ocultar" : "Mostrar"}
              </button>
              <button
                onClick={() => startEdit(slot)}
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => handleDelete(slot)}
                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
