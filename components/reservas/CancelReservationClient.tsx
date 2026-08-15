"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import type { CancelTokenReservation } from "@/lib/services/reservas-public";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente de confirmar",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function CancelReservationClient({
  token,
  reservation,
}: {
  token: string;
  reservation: CancelTokenReservation;
}) {
  const [status, setStatus] = useState(reservation.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyInactive = status === "cancelled" || status === "rejected";

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/public/reservas/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error || "No se pudo cancelar la reserva.");
        setLoading(false);
        return;
      }

      setStatus("cancelled");
      setLoading(false);
    } catch {
      setError("No se pudo cancelar la reserva. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      <h1 className="text-xl font-black text-slate-900">{reservation.store_name}</h1>

      <div className="mt-6 w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">
          {STATUS_LABEL[status] || status}
        </p>
        <p className="mt-2 text-lg font-black text-slate-900">{formatDate(reservation.reservation_date)}</p>
        <p className="text-sm font-bold text-slate-500">
          {formatTime(reservation.start_time)} · {reservation.table_name} · {reservation.party_size} personas
        </p>

        {status === "cancelled" ? (
          <div className="mt-5 flex flex-col items-center gap-2 text-emerald-600">
            <Check size={28} />
            <p className="text-sm font-bold">Tu reserva quedó cancelada.</p>
          </div>
        ) : alreadyInactive ? (
          <p className="mt-5 text-sm font-bold text-slate-400">
            Esta reserva ya no está activa.
          </p>
        ) : (
          <>
            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{error}</p>
            )}
            <button
              onClick={handleCancel}
              disabled={loading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
              Cancelar mi reserva
            </button>
          </>
        )}
      </div>
    </div>
  );
}
