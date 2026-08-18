"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Armchair,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Home,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Users,
} from "lucide-react";

import DateChipPicker from "./DateChipPicker";
import ReservationSteps from "./ReservationSteps";
import TableFloorPlan from "./TableFloorPlan";
import PhoneCountryField from "@/components/checkout/PhoneCountryField";
import type {
  ReservationSlot,
  ReservationSpace,
  ReservationSpaceElement,
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
  spaces: ReservationSpace[];
  elements: ReservationSpaceElement[];
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
const PAGE_BG = "#FBF7F0";
const HEADER_BG = "#071B35";

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
    year: "numeric",
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

    return new Set(
      board.occupied
        .filter((key) => key.endsWith(`:${selectedSlotId}`))
        .map((key) => key.split(":")[0])
    );
  }, [board, selectedSlotId]);

  const selectedSlot =
    board?.slots.find((slot) => slot.id === selectedSlotId) || null;

  const selectedSpace =
    board?.spaces.find((space) => space.id === selectedTable?.space_id) || null;

  const availableCount = useMemo(() => {
    if (!board || !selectedSlotId) return 0;
    return board.tables.filter(
      (table) => table.is_active && !occupiedForSlot.has(table.id)
    ).length;
  }, [board, selectedSlotId, occupiedForSlot]);

  const handleSelectTable = (table: ReservationTable) => {
    setSelectedTable(table);
    setPartySize((prev) =>
      Math.min(Math.max(prev, 1), table.capacity) ||
      Math.min(2, table.capacity)
    );
    setSubmitError(null);
    setShowForm(false);
  };

  const step = success ? 4 : showForm ? 4 : selectedTable ? 3 : 2;

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

  return (
    <div className="min-h-screen text-[#071B35]" style={{ backgroundColor: PAGE_BG }}>
      <header className="border-b border-white/10 text-white" style={{ backgroundColor: HEADER_BG }}>
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <p className="text-2xl font-black tracking-tight">{storeName}</p>
            <p className="text-[9px] font-black uppercase tracking-[.2em]" style={{ color: resolvedAccent }}>
              Restaurante
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={landingHref || "/"}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-white/80 hover:bg-white/5"
            >
              <Home size={15} /> Inicio
            </Link>
            <Link
              href={`/menu/${storeSlug}`}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black text-white/80 hover:bg-white/5"
            >
              <ShoppingBag size={15} /> Ver carta
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <ReservationSteps step={step} accent={resolvedAccent} />
        </div>

        {!success && (
          <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <section className="rounded-[26px] border border-[#E4D7C8] bg-white p-5 shadow-[0_10px_28px_rgba(27,20,16,.05)]">
                <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: resolvedAccent }}>
                  Paso 1
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight">
                  Elige tu fecha
                </h1>
                <p className="mt-1 text-sm font-semibold text-black/45">
                  Selecciona el día en que quieres visitarnos.
                </p>

                <div className="mt-5">
                  <DateChipPicker
                    value={date}
                    onChange={setDate}
                    accent={resolvedAccent}
                  />
                </div>
              </section>

              {loadingBoard && (
                <div className="rounded-[26px] border border-[#E4D7C8] bg-white p-8 text-center">
                  <Loader2 className="mx-auto animate-spin text-black/25" />
                  <p className="mt-3 text-sm font-bold text-black/40">
                    Cargando disponibilidad...
                  </p>
                </div>
              )}

              {boardError && !loadingBoard && (
                <div className="rounded-[26px] border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-600">
                  {boardError}
                </div>
              )}

              {board && !loadingBoard && !boardError && (
                <>
                  <section className="rounded-[26px] border border-[#E4D7C8] bg-white p-5 shadow-[0_10px_28px_rgba(27,20,16,.05)]">
                    <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: resolvedAccent }}>
                      Paso 2
                    </p>
                    <h2 className="mt-1 text-2xl font-black">
                      Elige el horario
                    </h2>

                    {board.blockedReason ? (
                      <p className="mt-4 rounded-2xl bg-[#F8F3EC] p-4 text-sm font-semibold text-black/55">
                        {board.blockedReason}
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
                            className="rounded-full border px-5 py-3 text-sm font-black transition"
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
                                  : "#071B35",
                            }}
                          >
                            {formatTime(slot.start_time)}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  {selectedSlotId && (
                    <section>
                      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: resolvedAccent }}>
                            Paso 3
                          </p>
                          <h2 className="mt-1 text-3xl font-black">
                            Elige tu mesa
                          </h2>
                          <p className="mt-1 text-sm font-semibold text-black/45">
                            {availableCount} mesas disponibles para este horario.
                          </p>
                        </div>
                      </div>

                      <TableFloorPlan
                        spaces={board.spaces || []}
                        elements={board.elements || []}
                        tables={board.tables}
                        occupiedTableIds={occupiedForSlot}
                        selectedTableId={selectedTable?.id || null}
                        onSelect={handleSelectTable}
                        accent={resolvedAccent}
                      />
                    </section>
                  )}
                </>
              )}
            </div>

            <aside className="xl:sticky xl:top-5 xl:self-start">
              <div className="overflow-hidden rounded-[26px] border border-[#E4D7C8] bg-white shadow-[0_12px_34px_rgba(27,20,16,.06)]">
                <div className="p-5">
                  <p className="text-[10px] font-black uppercase tracking-[.16em]" style={{ color: resolvedAccent }}>
                    Tu reserva
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Resumen</h2>

                  <div className="mt-5 space-y-3">
                    <SummaryRow
                      icon={<CalendarDays size={17} />}
                      label="Fecha"
                      value={formatDateLabel(date)}
                    />
                    <SummaryRow
                      icon={<Clock3 size={17} />}
                      label="Hora"
                      value={
                        selectedSlot
                          ? formatTime(selectedSlot.start_time)
                          : "Selecciona un horario"
                      }
                    />
                    <SummaryRow
                      icon={<MapPin size={17} />}
                      label="Espacio"
                      value={selectedSpace?.name || "Selecciona una mesa"}
                    />
                    <SummaryRow
                      icon={<Armchair size={17} />}
                      label="Mesa seleccionada"
                      value={
                        selectedTable
                          ? `${selectedTable.name} · ${selectedTable.capacity} personas`
                          : "Aún no seleccionada"
                      }
                      highlight={Boolean(selectedTable)}
                      accent={resolvedAccent}
                    />
                  </div>

                  {selectedTable && (
                    <>
                      <div className="mt-5">
                        <p className="text-xs font-black text-black/55">
                          Personas
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            onClick={() =>
                              setPartySize((n) => Math.max(1, n - 1))
                            }
                            disabled={partySize <= 1}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E1D6C8] disabled:opacity-30"
                          >
                            <Minus size={15} />
                          </button>
                          <span className="w-8 text-center text-lg font-black">
                            {partySize}
                          </span>
                          <button
                            onClick={() =>
                              setPartySize((n) =>
                                Math.min(selectedTable.capacity, n + 1)
                              )
                            }
                            disabled={partySize >= selectedTable.capacity}
                            className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#E1D6C8] disabled:opacity-30"
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                      </div>

                      {!showForm ? (
                        <button
                          onClick={() => setShowForm(true)}
                          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black text-white"
                          style={{ backgroundColor: resolvedAccent }}
                        >
                          Continuar <ArrowRight size={16} />
                        </button>
                      ) : (
                        <div className="mt-5 border-t border-[#EEE5DA] pt-5">
                          <button
                            onClick={() => setShowForm(false)}
                            className="mb-3 text-xs font-black"
                            style={{ color: resolvedAccent }}
                          >
                            ← Cambiar mesa o personas
                          </button>

                          <div className="space-y-3">
                            <input
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              placeholder="Nombre"
                              className="w-full rounded-xl border border-[#E1D6C8] px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
                            />
                            <input
                              value={customerLastName}
                              onChange={(e) =>
                                setCustomerLastName(e.target.value)
                              }
                              placeholder="Apellidos"
                              className="w-full rounded-xl border border-[#E1D6C8] px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-300"
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
                              className="w-full rounded-xl border border-[#E1D6C8] px-3 py-2.5 text-sm font-semibold outline-none"
                            />
                            <textarea
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Nota opcional"
                              className="min-h-[90px] w-full resize-none rounded-xl border border-[#E1D6C8] px-3 py-2.5 text-sm font-semibold outline-none"
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
                            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-black text-white disabled:opacity-60"
                            style={{ backgroundColor: resolvedAccent }}
                          >
                            {submitting && (
                              <Loader2 size={16} className="animate-spin" />
                            )}
                            Solicitar reserva
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="border-t border-[#EEE5DA] bg-[#FBF8F3] px-5 py-4">
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-black/45">
                    <ShieldCheck size={15} className="text-emerald-600" />
                    Tu solicitud será revisada por el restaurante antes de quedar confirmada.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}

        {success && selectedTable && selectedSlot && (
          <div className="mx-auto mt-8 max-w-xl rounded-[28px] border border-[#E4D7C8] bg-white p-8 text-center shadow-[0_16px_42px_rgba(27,20,16,.08)]">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                backgroundColor: `${resolvedAccent}18`,
                color: resolvedAccent,
              }}
            >
              <Check size={30} />
            </div>

            <p className="mt-4 text-[10px] font-black uppercase tracking-[.18em]" style={{ color: resolvedAccent }}>
              Reserva enviada
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Solicitud recibida
            </h2>
            <p className="mt-2 text-sm font-semibold text-black/45">
              {storeName} confirmará tu reserva pronto.
            </p>

            <div className="mt-6 rounded-2xl bg-[#F8F3EC] p-5 text-left">
              <p className="font-black">{formatDateLabel(date)}</p>
              <p className="mt-1 text-sm font-semibold text-black/55">
                {formatTime(selectedSlot.start_time)} · {selectedTable.name} ·{" "}
                {partySize} personas
              </p>
              {selectedSpace && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-black" style={{ color: resolvedAccent }}>
                  <MapPin size={12} />
                  {selectedSpace.name}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  highlight = false,
  accent = DEFAULT_ACCENT,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-[#F8F3EC] p-4">
      <div className="mt-0.5 text-black/45">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase text-black/35">
          {label}
        </p>
        <p
          className="mt-1 text-sm font-black"
          style={{ color: highlight ? accent : "#071B35" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
