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
  Ship,
  Truck,
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
    [accessStore, isSuperAdmin, selectedStore]
  );

  const canManage =
    access?.isSuperAdmin ||
    ["OWNER", "ADMIN", "OPERATIONS"].includes(
      access?.storeMembership?.role || ""
    );

  const [trip, setTrip] = useState<ShippingTrip | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

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
      status
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
    0
  );
  const billed = shipments.reduce(
    (sum, shipment) => sum + Number(shipment.service_price || 0),
    0
  );
  const delivered = shipments.filter(
    (shipment) => shipment.status === "delivered"
  ).length;
  const issues = shipments.filter(
    (shipment) => shipment.status === "issue"
  ).length;
  const open = shipments.length - delivered - issues;

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
          <Info
            title="Responsable"
            value={trip.driver_name || "Sin asignar"}
          />
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

          {shipments.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Package className="mx-auto mb-3 text-slate-300" size={48} />
              <p className="font-black">Este viaje todavía está vacío.</p>
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
                  {shipments.map((shipment) => (
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
