"use client";

import { useState } from "react";
import { CalendarOff, Loader2, Plus, Trash2 } from "lucide-react";

import { addBlockedDate, deleteBlockedDate } from "@/lib/services/reservas";
import type { BlockedDate } from "@/lib/reservas/types";

type Props = {
  storeId: string;
  blockedDates: BlockedDate[];
  onChange: () => void;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function BlockedDatesManager({ storeId, blockedDates, onChange }: Props) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!date) return;
    setSaving(true);
    const { error } = await addBlockedDate(storeId, date, reason);
    setSaving(false);
    if (error) {
      alert(
        error.message?.includes("duplicate") || (error as { code?: string }).code === "23505"
          ? "Esa fecha ya está bloqueada."
          : "No se pudo bloquear la fecha."
      );
      return;
    }
    setDate("");
    setReason("");
    onChange();
  };

  const handleDelete = async (blocked: BlockedDate) => {
    const confirmDelete = confirm(`¿Reabrir ${formatDate(blocked.blocked_date)} para reservas?`);
    if (!confirmDelete) return;

    const { error } = await deleteBlockedDate(blocked.id);
    if (error) {
      alert("No se pudo reabrir la fecha.");
      return;
    }
    onChange();
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Fechas bloqueadas
        </h2>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
          Feriados, eventos privados o mantenimiento — esos días no se ofrece
          ninguna franja en el portal público.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label className="text-xs font-bold text-slate-600">
          Fecha
          <input
            type="date"
            min={todayISO()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
          />
        </label>
        <label className="flex-1 text-xs font-bold text-slate-600">
          Motivo (opcional)
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: Cerrado por feriado"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
          />
        </label>
        <button
          onClick={handleAdd}
          disabled={saving || !date}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Bloquear
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {blockedDates.length === 0 && (
          <p className="rounded-2xl bg-slate-50 p-4 text-center text-xs font-semibold text-slate-400">
            No hay fechas bloqueadas.
          </p>
        )}

        {blockedDates.map((blocked) => (
          <div key={blocked.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
              <CalendarOff size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900">{formatDate(blocked.blocked_date)}</p>
              {blocked.reason && (
                <p className="text-xs font-semibold text-slate-500">{blocked.reason}</p>
              )}
            </div>
            <button
              onClick={() => handleDelete(blocked)}
              className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
