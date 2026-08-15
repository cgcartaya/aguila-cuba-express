"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Check, Clock3, Loader2, Users } from "lucide-react";

import TableFloorPlan from "./TableFloorPlan";
import type { ReservationSlot, ReservationTable } from "@/lib/reservas/types";

type BoardStore = {
  id: string;
  name: string;
  primary_color: string | null;
  secondary_color: string | null;
};

type Board = {
  store: BoardStore;
  tables: ReservationTable[];
  slots: ReservationSlot[];
  occupied: string[];
};

type Props = {
  storeSlug: string;
  storeName: string;
  landingHref?: string;
  accent: string;
  bg: string;
};

const DEFAULT_ACCENT = "#B45309";
const DEFAULT_BG = "#FAF6EF";
const INK = "#1B1410";

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
}

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function ReservasPageClient({ storeSlug, storeName, landingHref, accent, bg }: Props) {
  const resolvedAccent = accent || DEFAULT_ACCENT;
  const resolvedBg = bg || DEFAULT_BG;

  const [date, setDate] = useState(todayISO());
  const [board, setBoard] = useState<Board | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<ReservationTable | null>(null);

  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingBoard(true);
    setBoardError(null);
    setSelectedSlotId(null);
    setSelectedTable(null);
    setSuccess(false);

    fetch(`/api/public/reservas?slug=${encodeURIComponent(storeSlug)}&date=${date}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "No se pudo cargar la disponibilidad.");
        }
        return res.json();
      })
      .then((data: Board) => {
        if (cancelled) return;
        setBoard(data);
        if (data.slots.length === 1) setSelectedSlotId(data.slots[0].id);
      })
      .catch((err) => {
        if (cancelled) return;
        setBoardError(err.message || "No se pudo cargar la disponibilidad.");
      })
      .finally(() => {
        if (!cancelled) setLoadingBoard(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storeSlug, date]);

  const occupiedForSlot = useMemo(() => {
    if (!board || !selectedSlotId) return new Set<string>();
    const ids = board.occupied
      .filter((key) => key.endsWith(`:${selectedSlotId}`))
      .map((key) => key.split(":")[0]);
    return new Set(ids);
  }, [board, selectedSlotId]);

  const handleSelectTable = (table: ReservationTable) => {
    setSelectedTable(table);
    setPartySize(Math.min(2, table.capacity));
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!selectedTable || !selectedSlotId) return;
    if (!customerName.trim() || customerPhone.replace(/\D/g, "").length < 7) {
      setSubmitError("Completa tu nombre y un teléfono válido.");
      return;
    }
    if (partySize < 1 || partySize > selectedTable.capacity) {
      setSubmitError(`La cantidad de personas debe ser entre 1 y ${selectedTable.capacity}.`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/public/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_slug: storeSlug,
          table_id: selectedTable.id,
          slot_id: selectedSlotId,
          reservation_date: date,
          party_size: partySize,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          notes: notes.trim(),
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(body.error || "No se pudo crear la reserva.");
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);
    } catch {
      setSubmitError("No se pudo crear la reserva. Intenta de nuevo.");
      setSubmitting(false);
    }
  };

  const selectedSlot = board?.slots.find((s) => s.id === selectedSlotId) || null;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: resolvedBg, color: INK, fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <header
        className="sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 backdrop-blur"
        style={{ borderColor: `${resolvedAccent}22`, backgroundColor: `${resolvedBg}dd` }}
      >
        <Link
          href={landingHref || "/"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${resolvedAccent}15`, color: resolvedAccent }}
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{storeName}</p>
          <p className="text-[11px] font-bold opacity-60">Reservar mesa</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-16 pt-5">
        {success && selectedTable && selectedSlot ? (
          <div className="rounded-3xl border p-6 text-center" style={{ borderColor: `${resolvedAccent}33` }}>
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${resolvedAccent}18`, color: resolvedAccent }}
            >
              <Check size={26} />
            </div>
            <h1 className="text-lg font-black">¡Solicitud enviada!</h1>
            <p className="mt-2 text-sm font-semibold opacity-70">
              {storeName} confirmará tu reserva pronto. Te avisarán al{" "}
              <strong>{customerPhone}</strong>.
            </p>
            <div className="mt-4 space-y-1 rounded-2xl bg-black/5 p-4 text-left text-sm font-bold">
              <p>{formatDateLabel(date)}</p>
              <p>
                {formatTime(selectedSlot.start_time)} · {selectedTable.name} · {partySize} personas
              </p>
            </div>
            <button
              onClick={() => {
                setSuccess(false);
                setSelectedTable(null);
              }}
              className="mt-5 rounded-xl px-4 py-2 text-sm font-black"
              style={{ backgroundColor: resolvedAccent, color: "#fff" }}
            >
              Hacer otra reserva
            </button>
          </div>
        ) : (
          <>
            <section>
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wide opacity-60">
                <CalendarDays size={14} />
                Fecha
              </label>
              <input
                type="date"
                min={todayISO()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-2xl border-2 bg-transparent px-4 py-3 text-sm font-bold"
                style={{ borderColor: `${resolvedAccent}33` }}
              />
            </section>

            {loadingBoard && (
              <div className="mt-6 flex items-center gap-2 text-sm font-bold opacity-60">
                <Loader2 size={16} className="animate-spin" />
                Cargando disponibilidad...
              </div>
            )}

            {boardError && !loadingBoard && (
              <p className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
                {boardError}
              </p>
            )}

            {board && !loadingBoard && !boardError && (
              <>
                {board.slots.length === 0 ? (
                  <p className="mt-6 rounded-2xl bg-black/5 p-4 text-center text-sm font-semibold opacity-60">
                    No hay horarios de reserva disponibles ese día.
                  </p>
                ) : (
                  <section className="mt-6">
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wide opacity-60">
                      <Clock3 size={14} />
                      Horario
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {board.slots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={() => {
                            setSelectedSlotId(slot.id);
                            setSelectedTable(null);
                          }}
                          className="rounded-full border-2 px-4 py-2 text-sm font-bold"
                          style={{
                            borderColor: selectedSlotId === slot.id ? resolvedAccent : `${resolvedAccent}33`,
                            backgroundColor: selectedSlotId === slot.id ? `${resolvedAccent}18` : "transparent",
                          }}
                        >
                          {formatTime(slot.start_time)}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {selectedSlotId && (
                  <section className="mt-6">
                    <p className="text-xs font-black uppercase tracking-wide opacity-60">
                      Elige tu mesa
                    </p>
                    <div className="mt-2">
                      <TableFloorPlan
                        tables={board.tables}
                        occupiedTableIds={occupiedForSlot}
                        selectedTableId={selectedTable?.id || null}
                        onSelect={handleSelectTable}
                        accent={resolvedAccent}
                      />
                    </div>
                  </section>
                )}

                {selectedTable && selectedSlotId && (
                  <section
                    className="mt-6 rounded-3xl border-2 p-4"
                    style={{ borderColor: `${resolvedAccent}33` }}
                  >
                    <p className="text-sm font-black">
                      {selectedTable.name} · hasta {selectedTable.capacity} personas
                    </p>

                    <label className="mt-3 block text-xs font-bold opacity-70">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} /> Cantidad de personas
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={selectedTable.capacity}
                        value={partySize}
                        onChange={(e) => setPartySize(Number(e.target.value) || 1)}
                        className="mt-1 w-full rounded-xl border-2 bg-transparent px-3 py-2 text-sm font-bold"
                        style={{ borderColor: `${resolvedAccent}33` }}
                      />
                    </label>

                    <label className="mt-3 block text-xs font-bold opacity-70">
                      Nombre
                      <input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Tu nombre completo"
                        className="mt-1 w-full rounded-xl border-2 bg-transparent px-3 py-2 text-sm font-bold"
                        style={{ borderColor: `${resolvedAccent}33` }}
                      />
                    </label>

                    <label className="mt-3 block text-xs font-bold opacity-70">
                      Teléfono
                      <input
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Para confirmarte la reserva"
                        className="mt-1 w-full rounded-xl border-2 bg-transparent px-3 py-2 text-sm font-bold"
                        style={{ borderColor: `${resolvedAccent}33` }}
                      />
                    </label>

                    <label className="mt-3 block text-xs font-bold opacity-70">
                      Nota (opcional)
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ej: cumpleaños, silla para bebé..."
                        className="mt-1 w-full rounded-xl border-2 bg-transparent px-3 py-2 text-sm font-bold"
                        style={{ borderColor: `${resolvedAccent}33` }}
                      />
                    </label>

                    {submitError && (
                      <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                        {submitError}
                      </p>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black disabled:opacity-60"
                      style={{ backgroundColor: resolvedAccent, color: "#fff" }}
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      Solicitar reserva
                    </button>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
