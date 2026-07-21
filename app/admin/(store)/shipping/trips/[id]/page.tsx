"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Package,
  Search,
  Ship,
  SlidersHorizontal,
  Truck,
  X,
} from "lucide-react";

import InvoiceActions from "@/components/admin/shipping/InvoiceActions";
import ShippingStatusBadge from "@/components/admin/shipping/ShippingStatusBadge";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  changeShippingTripStatus,
  closeShippingTrip,
  getShipmentsByTripId,
  getShippingTripById,
} from "@/lib/services/shipping-trips";
import {
  getShippingTripStatusLabel,
  type Shipment,
  type ShippingTrip,
  type ShippingTripStatus,
} from "@/lib/shipping/types";

function money(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value || 0));
}

function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Sin definir";
}

export default function ShippingTripDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { access, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore],
  );

  const canManage =
    access?.isSuperAdmin ||
    ["OWNER", "ADMIN", "OPERATIONS"].includes(
      access?.storeMembership?.role || "",
    );

  const [trip, setTrip] = useState<ShippingTrip | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  async function load() {
    if (!activeStore?.id || !params.id) return;

    setLoading(true);
    setError("");

    const [tripResult, shipmentResult] = await Promise.all([
      getShippingTripById(activeStore.id, params.id),
      getShipmentsByTripId(activeStore.id, params.id),
    ]);

    if (tripResult.error) setError(tripResult.error.message);

    setTrip(tripResult.data || null);
    setShipments((shipmentResult.data || []) as Shipment[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, [activeStore?.id, params.id]);

  async function setStatus(status: ShippingTripStatus) {
    if (!activeStore?.id || !trip) return;

    setWorking(true);
    setError("");

    const result = await changeShippingTripStatus(
      activeStore.id,
      trip.id,
      status,
    );

    if (result.error) {
      setError(result.error.message || "No se pudo cambiar el estado.");
    }

    await load();
    setWorking(false);
  }

  async function closeTrip(force = false) {
    if (!activeStore?.id || !trip) return;

    setWorking(true);
    setError("");

    const result = await closeShippingTrip(activeStore.id, trip.id, force);

    if (result.error) {
      setError(result.error.message || "No se pudo cerrar el viaje.");
      setWorking(false);
      return;
    }

    await load();
    setWorking(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-700" size={34} />
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="p-8">
        <p className="font-black text-rose-700">No se encontró el viaje.</p>
      </main>
    );
  }

  const tripClosed = trip.status === "completed";
  const totalWeight = shipments.reduce(
    (sum, shipment) => sum + Number(shipment.weight_lb || 0),
    0,
  );
  const billed = shipments.reduce(
    (sum, shipment) => sum + Number(shipment.service_price || 0),
    0,
  );
  const delivered = shipments.filter(
    (shipment) => shipment.status === "delivered",
  ).length;
  const issues = shipments.filter(
    (shipment) => shipment.status === "issue",
  ).length;
  const open = shipments.length - delivered - issues;
  const progress =
    shipments.length > 0
      ? Math.round(((delivered + issues) / shipments.length) * 100)
      : 0;

  const normalizedSearch = search.trim().toLowerCase();
  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      !normalizedSearch ||
      [
        shipment.order_number,
        shipment.tracking_code,
        shipment.sender_name,
        shipment.sender_phone,
        shipment.recipient_name,
        shipment.recipient_phone,
        shipment.location,
        shipment.recipient_address,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedSearch),
        );

    const matchesStatus =
      statusFilter === "all" || shipment.status === statusFilter;
    const matchesPayment =
      paymentFilter === "all" || shipment.payment_status === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const filtersActive =
    Boolean(normalizedSearch) ||
    statusFilter !== "all" ||
    paymentFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setPaymentFilter("all");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 pb-28 md:p-7">
      <div className="mx-auto max-w-[1500px]">
        <button
          onClick={() => router.push("/admin/shipping/trips")}
          className="mb-5 inline-flex items-center gap-2 font-black text-slate-600"
        >
          <ArrowLeft size={18} />
          Volver a viajes
        </button>

        <header className="rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#0a2d63] to-[#1554a6] p-6 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">
                Viaje {trip.trip_number}
              </p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">
                {trip.name}
              </h1>
              <p className="mt-2 font-semibold text-blue-100/80">
                {trip.origin || "Origen sin definir"} →{" "}
                {trip.destination || "Destino sin definir"}
              </p>
              <span className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-black">
                {getShippingTripStatusLabel(trip.status)}
              </span>
            </div>

            {canManage && !tripClosed && (
              <div className="flex flex-wrap gap-2">
                {trip.status === "preparing" && (
                  <Action
                    icon={<Truck size={18} />}
                    label="Salió hacia Cuba"
                    onClick={() => setStatus("in_transit")}
                    disabled={working}
                  />
                )}

                {trip.status === "in_transit" && (
                  <Action
                    icon={<Ship size={18} />}
                    label="Recibido en Cuba"
                    onClick={() => setStatus("received_cuba")}
                    disabled={working}
                  />
                )}

                {trip.status === "received_cuba" && (
                  <Action
                    icon={<Package size={18} />}
                    label="Comenzar reparto"
                    onClick={() => setStatus("in_delivery")}
                    disabled={working}
                  />
                )}

                <button
                  onClick={() => closeTrip(false)}
                  disabled={working}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-black text-white disabled:opacity-50"
                >
                  <CheckCircle2 size={18} />
                  Cerrar viaje
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric label="Envíos" value={shipments.length.toString()} />
            <Metric label="Pendientes" value={open.toString()} />
            <Metric label="Entregados" value={delivered.toString()} />
            <Metric label="Libras" value={totalWeight.toFixed(1)} />
            <Metric label="Facturado" value={money(billed)} />
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <div className="flex items-center justify-between gap-4 text-sm font-black">
              <span>Progreso operativo</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-semibold text-blue-100/80">
              {delivered} entregados · {issues} incidencias · {open} pendientes
            </p>
          </div>
        </header>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">
            <AlertTriangle className="mr-2 inline" size={18} />
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Info title="Salida" value={date(trip.departure_date)} />
          <Info
            title="Llegada estimada"
            value={date(trip.estimated_arrival_date)}
          />
          <Info title="Responsable" value={trip.driver_name || "Sin asignar"} />
        </section>

        <section className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#061b3a]">
                Envíos del viaje
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Factura y WhatsApp permanecen disponibles incluso después de
                cerrar el viaje.
              </p>
            </div>

            {!tripClosed && canManage && (
              <Link
                href={`/admin/shipping/new?tripId=${encodeURIComponent(trip.id)}`}
                className="rounded-2xl bg-[#0a2d63] px-5 py-3 text-center font-black text-white"
              >
                Registrar envío
              </Link>
            )}
          </div>

          {shipments.length > 0 && (
            <div className="border-b border-slate-100 bg-slate-50/70 p-4 md:p-5">
              <div className="grid gap-3 xl:grid-cols-[1fr_220px_220px_auto]">
                <label className="relative block">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar orden, rastreo, cliente, destinatario, teléfono o lugar"
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <label className="relative block">
                  <SlidersHorizontal
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={17}
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-4 font-bold text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendiente de salida</option>
                    <option value="in_transit">En tránsito hacia Cuba</option>
                    <option value="received_cuba">Recibido en Cuba</option>
                    <option value="in_delivery">En reparto</option>
                    <option value="delivered">Entregado</option>
                    <option value="issue">Incidencia</option>
                  </select>
                </label>

                <select
                  value={paymentFilter}
                  onChange={(event) => setPaymentFilter(event.target.value)}
                  className="h-12 rounded-2xl border border-slate-200 bg-white px-4 font-bold text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="all">Todos los cobros</option>
                  <option value="pending">Pendiente</option>
                  <option value="partial">Pago parcial</option>
                  <option value="paid">Pagado</option>
                </select>

                <div className="flex items-center gap-2">
                  <span className="inline-flex h-12 min-w-[120px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700">
                    {filteredShipments.length} resultado
                    {filteredShipments.length === 1 ? "" : "s"}
                  </span>
                  {filtersActive && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      title="Limpiar filtros"
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {shipments.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package className="mx-auto mb-3 text-slate-300" size={48} />
              <p className="font-black">Este viaje todavía está vacío.</p>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Search className="mx-auto mb-3 text-slate-300" size={46} />
              <p className="font-black text-slate-800">
                No hay envíos que coincidan.
              </p>
              <p className="mt-1 text-sm font-semibold">
                Prueba otra búsqueda o limpia los filtros.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-2xl bg-[#0a2d63] px-5 py-3 font-black text-white"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1120px]">
                <div className="grid grid-cols-[80px_1.25fr_1.1fr_1fr_150px_120px_270px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <span>Orden</span>
                  <span>Cliente / rastreo</span>
                  <span>Destinatario</span>
                  <span>Destino</span>
                  <span>Estado</span>
                  <span>Total</span>
                  <span className="text-right">Acciones</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredShipments.map((shipment) => (
                    <article
                      key={shipment.id}
                      className="grid grid-cols-[80px_1.25fr_1.1fr_1fr_150px_120px_270px] items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="font-black text-[#0a2d63]">
                        #{shipment.order_number || "—"}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-black text-slate-900">
                          {shipment.sender_name || "Sin cliente"}
                        </p>
                        <p className="truncate text-xs font-bold text-blue-700">
                          {shipment.tracking_code || shipment.id.slice(0, 8)}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {shipment.sender_phone || "Sin teléfono"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-800">
                          {shipment.recipient_name || "Sin destinatario"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {shipment.recipient_phone || "Sin teléfono"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-800">
                          {shipment.location || "Sin lugar"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {shipment.recipient_address || "Sin dirección"}
                        </p>
                      </div>

                      <div>
                        <ShippingStatusBadge status={shipment.status} />
                      </div>

                      <div>
                        <p className="font-black text-slate-900">
                          {money(shipment.service_price)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {shipment.payment_status === "paid"
                            ? "Pagado"
                            : shipment.payment_status === "partial"
                              ? "Pago parcial"
                              : "Pendiente"}
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <InvoiceActions shipment={shipment} compact />

                        {!tripClosed && canManage && (
                          <Link
                            href={`/admin/shipping/${shipment.id}/edit`}
                            title="Editar envío"
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Edit3 size={17} />
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs font-black uppercase tracking-wider text-blue-200">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {title}
      </p>
      <p className="mt-2 font-black text-slate-900">{value}</p>
    </div>
  );
}

function Action({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-[#061b3a] disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}
