"use client";

import { useState } from "react";
import { Check, MessageCircle, Users, X } from "lucide-react";

import { updateReservationStatus } from "@/lib/services/reservas";
import { openWhatsAppMessage } from "@/lib/utils/whatsapp";
import type { Reservation, ReservationStatus } from "@/lib/reservas/types";

type Props = {
  reservations: Reservation[];
  storeName: string;
  onChange: () => void;
};

const STATUS_BADGE: Record<ReservationStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-slate-200 text-slate-500",
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function ReservationsList({ reservations, storeName, onChange }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    setUpdatingId(id);
    const { error } = await updateReservationStatus(id, status);
    setUpdatingId(null);
    if (error) {
      alert("No se pudo actualizar la reserva.");
      return;
    }
    onChange();
  };

  const notifyCustomer = (reservation: Reservation, confirmed: boolean) => {
    const message = confirmed
      ? `¡Hola ${reservation.customer_name}! Tu reserva en ${storeName} para ${reservation.party_size} personas el ${formatDate(
          reservation.reservation_date
        )} a las ${formatTime(reservation.reservation_slots?.start_time || "00:00")} quedó CONFIRMADA. ¡Te esperamos!`
      : `Hola ${reservation.customer_name}, sobre tu solicitud de reserva en ${storeName} para el ${formatDate(
          reservation.reservation_date
        )}: en este momento no podemos confirmarla. Disculpa las molestias.`;

    openWhatsAppMessage({ app: "personal", phone: reservation.customer_phone, message });
  };

  if (reservations.length === 0) {
    return (
      <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-semibold text-slate-400">
        No hay solicitudes de reserva para mostrar.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {reservations.map((reservation) => (
        <div key={reservation.id} className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-slate-900">{reservation.customer_name}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[reservation.status]}`}
                >
                  {STATUS_LABEL[reservation.status]}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {formatDate(reservation.reservation_date)} ·{" "}
                {formatTime(reservation.reservation_slots?.start_time || "00:00")} ·{" "}
                {reservation.reservation_tables?.name || "Mesa"}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-slate-500">
                <Users size={12} /> {reservation.party_size} personas · {reservation.customer_phone}
              </p>
              {reservation.notes && (
                <p className="mt-1 text-xs italic text-slate-400">&quot;{reservation.notes}&quot;</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => notifyCustomer(reservation, reservation.status === "confirmed")}
                className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                title="Avisar por WhatsApp"
              >
                <MessageCircle size={16} />
              </button>

              {reservation.status === "pending" && (
                <>
                  <button
                    disabled={updatingId === reservation.id}
                    onClick={() => handleStatusChange(reservation.id, "confirmed")}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Check size={14} />
                    Confirmar
                  </button>
                  <button
                    disabled={updatingId === reservation.id}
                    onClick={() => handleStatusChange(reservation.id, "rejected")}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                  >
                    <X size={14} />
                    Rechazar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
