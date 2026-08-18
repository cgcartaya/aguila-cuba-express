"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock3,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";

import DateChipPicker from "./DateChipPicker";
import ReservationSteps from "./ReservationSteps";
import TableFloorPlan from "./TableFloorPlan";
import PhoneCountryField from "@/components/checkout/PhoneCountryField";
import type {
  ReservationSlot,
  ReservationTable,
} from "@/lib/reservas/types";

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
  blockedReason: string | null;
};

type Props = {
  storeSlug: string;
  storeName: string;
  landingHref?: string;
  accent: string;
  bg: string;
};

const DEFAULT_ACCENT = "#FC6C26";
const INK = "#1B1410";
const PAGE_BG = "#FBF6EC";
const HEADER_BG = "#17100C";

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function ReservasPageClient({
  storeSlug,
  storeName,
  landingHref,
  accent,
}: Props) {
  const resolvedAccent = accent || DEFAULT_ACCENT;

  const [date, setDate] = useState(todayISO());
  const [board, setBoard] = useState<Board | null>(null);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] =
    useState<ReservationTable | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [partySize, setPartySize] = useState(2);
  const [customerName, setCustomerName] = useState("");
  const [customerLastName, setCustomerLastName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+53 ");
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
    setShowForm(false);
    setSuccess(false);

    fetch(
      `/api/public/reservas?slug=${encodeURIComponent(
        storeSlug
      )}&date=${date}`
    )
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            body.error || "No se pudo cargar la disponibilidad."
          );
        }
        return res.json();
      })
      .then((data: Board) => {
        if (cancelled) return;

        setBoard(data);

        if (data.slots.length > 0) {
          setSelectedSlotId(data.slots[0].id);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setBoardError(
          err.message || "No se pudo cargar la disponibilidad."
        );
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

  const availableCount = useMemo(() => {
    if (!board || !selectedSlotId) return 0;

    return board.tables.filter(
      (table) =>
        table.is_active && !occupiedForSlot.has(table.id)
    ).length;
  }, [board, selectedSlotId, occupiedForSlot]);

  const zones = useMemo(
    () =>
      Array.from(
        new Set(
          (board?.tables || [])
            .map((table) => (table.zone || "").trim())
            .filter(Boolean)
        )
      ),
    [board]
  );

  const handleSelectTable = (table: ReservationTable) => {
    setSelectedTable(table);
    setPartySize((prev) =>
      Math.min(Math.max(prev, 1), table.capacity) ||
      Math.min(2, table.capacity)
    );
    setSubmitError(null);
    setShowForm(false);
  };

  const step = success
    ? 4
    : showForm
    ? 4
    : selectedTable
    ? 4
    : selectedSlotId
    ? 3
    : 2;

  const handleSubmit = async () => {
    if (!selectedTable || !selectedSlotId) return;

    if (!customerName.trim() || !customerLastName.trim()) {
      setSubmitError("Completa tu nombre y apellidos.");
      return;
    }

    if (customerPhone.replace(/\D/g, "").length < 7) {
      setSubmitError("Completa un teléfono válido.");
      return;
    }

    if (
      customerEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
    ) {
      setSubmitError("El correo no es válido.");
      return;
    }

    if (partySize < 1 || partySize > selectedTable.capacity) {
      setSubmitError(
        `La cantidad de personas debe ser entre 1 y ${selectedTable.capacity}.`
      );
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
          customer_last_name: customerLastName.trim(),
          customer_email: customerEmail.trim(),
          customer_phone: customerPhone.trim(),
          notes: notes.trim(),
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(
          body.error || "No se pudo crear la reserva."
        );
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setSubmitting(false);
    } catch {
      setSubmitError(
        "No se pudo crear la reserva. Intenta de nuevo."
      );
      setSubmitting(false);
    }
  };

  const selectedSlot =
    board?.slots.find((slot) => slot.id === selectedSlotId) || null;

  const showStickyBar =
    !success && selectedTable && selectedSlotId && !showForm;

  return (
    <div
      className="min-h-screen text-[#1B1410]"
      style={{ backgroundColor: PAGE_BG }}
    >
      <header
        className="relative overflow-hidden border-b border-white/10 text-white"
        style={{ backgroundColor: HEADER_BG }}
      >
        <div className="absolute inset-0 opacity-[.035] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-4 sm:px-6">
          <div className="flex items-center justify-between">
            <Link
              href={landingHref || "/"}
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-white/55 transition hover:text-white"
            >
              <ArrowLeft size={13} />
              Volver
            </Link>

            {!success && (
              <div className="hidden w-48 sm:block">
                <ReservationSteps
                  step={step}
                  accent={resolvedAccent}
                />
              </div>
            )}
          </div>

          <div className="mt-7 max-w-2xl">
            <p
              className="text-[10px] font-black uppercase tracking-[.28em]"
              style={{ color: resolvedAccent }}
            >
              {storeName}
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Reserva tu mesa
            </h1>

            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/55">
              Elige la fecha, el horario y la mesa que mejor se adapte a
              tu visita.
            </p>

            {zones.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {zones.map((zone) => (
                  <span
                    key={zone}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[10px] font-black text-white/70"
                  >
                    <MapPin size={10} style={{ color: resolvedAccent }} />
                    {zone}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {!success && (
        <div className="border-b border-[#E9E0D4] bg-[#FBF6EC] px-4 py-3 sm:hidden">
          <ReservationSteps
            step={step}
            accent={resolvedAccent}
          />
        </div>
      )}

      <main
        className={`mx-auto max-w-6xl px-4 py-6 sm:px-6 ${
          showStickyBar ? "pb-28" : "pb-16"
        }`}
      >
        {success && selectedTable && selectedSlot ? (
          <div className="mx-auto max-w-xl rounded-3xl border border-[#E7DED2] bg-white p-7 text-center shadow-[0_14px_40px_rgba(27,20,16,.08)]">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
              style={{
                backgroundColor: `${resolvedAccent}18`,
                color: resolvedAccent,
              }}
            >
              <Check size={26} />
            </div>

            <p className="text-[10px] font-black uppercase tracking-[.2em] text-orange-600">
              Reserva enviada
            </p>

            <h2 className="mt-2 text-2xl font-black">
              ¡Solicitud recibida!
            </h2>

            <p className="mt-2 text-sm font-semibold leading-6 text-black/55">
              {storeName} confirmará tu reserva pronto.
            </p>

            <div className="mt-5 rounded-2xl bg-[#F8F3EC] p-4 text-left">
              <p className="text-sm font-black">
                {formatDateLabel(date)}
              </p>
              <p className="mt-1 text-sm font-semibold text-black/55">
                {formatTime(selectedSlot.start_time)} ·{" "}
                {selectedTable.name} · {partySize} personas
              </p>
              {selectedTable.zone && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-black text-orange-600">
                  <MapPin size={12} />
                  {selectedTable.zone}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setSuccess(false);
                setSelectedTable(null);
                setShowForm(false);
              }}
              className="mt-5 rounded-full px-5 py-3 text-sm font-black text-white"
              style={{ backgroundColor: resolvedAccent }}
            >
              Hacer otra reserva
            </button>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <section className="rounded-3xl border border-[#E7DED2] bg-white p-5 shadow-[0_8px_28px_rgba(27,20,16,.04)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-600">
                      Paso 1
                    </p>
                    <h2 className="mt-1 text-lg font-black">
                      Elige la fecha
                    </h2>
                  </div>
                  <Sparkles size={18} className="text-orange-300" />
                </div>

                <div className="mt-4">
                  <DateChipPicker
                    value={date}
                    onChange={setDate}
                    accent={resolvedAccent}
                  />
                </div>
              </section>

              {loadingBoard && (
                <div className="rounded-3xl border border-[#E7DED2] bg-white p-6">
                  <div className="flex items-center gap-2 text-sm font-bold text-black/45">
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Cargando disponibilidad...
                  </div>
                </div>
              )}

              {boardError && !loadingBoard && (
                <div className="rounded-3xl border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600">
                  {boardError}
                </div>
              )}

              {board && !loadingBoard && !boardError && (
                <>
                  <section className="rounded-3xl border border-[#E7DED2] bg-white p-5 shadow-[0_8px_28px_rgba(27,20,16,.04)]">
                    <p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-600">
                      Paso 2
                    </p>
                    <h2 className="mt-1 text-lg font-black">
                      Elige el horario
                    </h2>

                    {board.blockedReason ? (
                      <p className="mt-4 rounded-2xl bg-[#F8F3EC] p-4 text-sm font-semibold text-black/55">
                        {board.blockedReason}
                      </p>
                    ) : board.slots.length === 0 ? (
                      <p className="mt-4 rounded-2xl bg-[#F8F3EC] p-4 text-sm font-semibold text-black/55">
                        No hay horarios de reserva disponibles ese día.
                      </p>
                    ) : (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {board.slots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => {
                              setSelectedSlotId(slot.id);
                              setSelectedTable(null);
                              setShowForm(false);
                            }}
                            className="rounded-full border px-4 py-2.5 text-sm font-black transition"
                            style={{
                              borderColor:
                                selectedSlotId === slot.id
                                  ? resolvedAccent
                                  : "#E0D5C8",
                              backgroundColor:
                                selectedSlotId === slot.id
                                  ? resolvedAccent
                                  : "#fff",
                              color:
                                selectedSlotId === slot.id
                                  ? "#fff"
                                  : INK,
                            }}
                          >
                            {formatTime(slot.start_time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  {selectedSlotId && (
                    <section className="rounded-3xl border border-[#E7DED2] bg-white p-5 shadow-[0_8px_28px_rgba(27,20,16,.04)]">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-600">
                            Paso 3
                          </p>
                          <h2 className="mt-1 text-lg font-black">
                            Elige tu mesa
                          </h2>
                          <p className="mt-1 text-xs font-semibold text-black/40">
                            {availableCount} disponibles para este horario.
                          </p>
                        </div>

                        <div className="flex gap-3 text-[10px] font-black text-black/40">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                            Disponible
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                            Ocupada
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-[#EAE1D6] bg-[#FCF9F4] p-3">
                        <TableFloorPlan
                          tables={board.tables}
                          occupiedTableIds={occupiedForSlot}
                          selectedTableId={
                            selectedTable?.id || null
                          }
                          onSelect={handleSelectTable}
                          accent={resolvedAccent}
                        />
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            <aside className="lg:sticky lg:top-5 lg:self-start">
              <div className="rounded-3xl border border-[#E7DED2] bg-white p-5 shadow-[0_10px_32px_rgba(27,20,16,.06)]">
                <p className="text-[10px] font-black uppercase tracking-[.16em] text-orange-600">
                  Tu reserva
                </p>
                <h2 className="mt-1 text-lg font-black">
                  Resumen
                </h2>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="rounded-2xl bg-[#F8F3EC] p-3">
                    <p className="text-[10px] font-black uppercase text-black/35">
                      Fecha
                    </p>
                    <p className="mt-1 font-black">
                      {formatDateLabel(date)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8F3EC] p-3">
                    <p className="text-[10px] font-black uppercase text-black/35">
                      Horario
                    </p>
                    <p className="mt-1 font-black">
                      {selectedSlot
                        ? formatTime(selectedSlot.start_time)
                        : "Selecciona un horario"}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-[#F8F3EC] p-3">
                    <p className="text-[10px] font-black uppercase text-black/35">
                      Mesa
                    </p>
                    <p className="mt-1 font-black">
                      {selectedTable
                        ? selectedTable.name
                        : "Selecciona una mesa"}
                    </p>

                    {selectedTable?.zone && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-orange-600">
                        <MapPin size={11} />
                        {selectedTable.zone}
                      </p>
                    )}
                  </div>
                </div>

                {selectedTable && selectedSlotId && !showForm && (
                  <div className="mt-5">
                    <p className="flex items-center gap-1.5 text-xs font-black text-black/55">
                      <Users size={13} />
                      Personas
                    </p>

                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() =>
                          setPartySize((n) => Math.max(1, n - 1))
                        }
                        disabled={partySize <= 1}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E1D6C8] disabled:opacity-30"
                      >
                        <Minus size={15} />
                      </button>

                      <span className="w-8 text-center text-lg font-black">
                        {partySize}
                      </span>

                      <button
                        onClick={() =>
                          setPartySize((n) =>
                            Math.min(
                              selectedTable.capacity,
                              n + 1
                            )
                          )
                        }
                        disabled={
                          partySize >= selectedTable.capacity
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E1D6C8] disabled:opacity-30"
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <button
                      onClick={() => setShowForm(true)}
                      className="mt-5 w-full rounded-full py-3 text-sm font-black text-white"
                      style={{ backgroundColor: resolvedAccent }}
                    >
                      Continuar
                    </button>
                  </div>
                )}

                {selectedTable && selectedSlotId && showForm && (
                  <div className="mt-5 border-t border-[#EEE5DA] pt-5">
                    <button
                      onClick={() => setShowForm(false)}
                      className="mb-3 text-xs font-black text-orange-600"
                    >
                      ← Cambiar mesa o personas
                    </button>

                    <div className="space-y-3">
                      <input
                        value={customerName}
                        onChange={(e) =>
                          setCustomerName(e.target.value)
                        }
                        placeholder="Nombre"
                        className="w-full rounded-xl border border-[#E1D6C8] bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
                      />

                      <input
                        value={customerLastName}
                        onChange={(e) =>
                          setCustomerLastName(e.target.value)
                        }
                        placeholder="Apellidos"
                        className="w-full rounded-xl border border-[#E1D6C8] bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
                      />

                      <PhoneCountryField
                        name="customerPhone"
                        value={customerPhone}
                        onChange={(e) =>
                          setCustomerPhone(e.target.value)
                        }
                        placeholder="Teléfono"
                        className=""
                      />

                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) =>
                          setCustomerEmail(e.target.value)
                        }
                        placeholder="Correo (opcional)"
                        className="w-full rounded-xl border border-[#E1D6C8] bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
                      />

                      <textarea
                        value={notes}
                        onChange={(e) =>
                          setNotes(e.target.value)
                        }
                        placeholder="Nota opcional: cumpleaños, silla para bebé..."
                        className="min-h-[88px] w-full resize-none rounded-xl border border-[#E1D6C8] bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
                      />
                    </div>

                    {submitError && (
                      <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                        {submitError}
                      </p>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-black text-white disabled:opacity-60"
                      style={{
                        backgroundColor: resolvedAccent,
                      }}
                    >
                      {submitting && (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      )}
                      Solicitar reserva
                    </button>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </main>

      {showStickyBar && selectedTable && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E4D9CC] bg-[#FBF6EC]/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-black">
                {selectedTable.name} · {partySize} personas
              </p>
              <p className="truncate text-[11px] font-bold text-black/45">
                {selectedSlot
                  ? formatTime(selectedSlot.start_time)
                  : ""}{" "}
                · {formatDateLabel(date)}
              </p>
            </div>

            <button
              onClick={() => setShowForm(true)}
              className="shrink-0 rounded-full px-5 py-2.5 text-sm font-black text-white"
              style={{ backgroundColor: resolvedAccent }}
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
