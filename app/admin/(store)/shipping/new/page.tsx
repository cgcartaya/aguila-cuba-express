"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plane,
  Plus,
  Route,
  Settings,
  Ship,
  Truck,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import ShipmentForm from "@/components/admin/shipping/ShipmentForm";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { createShipment, getShippingDriversByStoreId } from "@/lib/services/shipping";
import { getShippingConfiguration } from "@/lib/services/shipping-settings";
import { getOpenShippingTripsByStoreId, getShippingTripById } from "@/lib/services/shipping-trips";
import type {
  ShipmentInput,
  ShippingCountry,
  ShippingDriver,
  ShippingExtraFee,
  ShippingLocation,
  ShippingMunicipality,
  ShippingProvince,
  ShippingRate,
  ShippingServiceType,
  ShippingSettings,
  ShippingTrip,
} from "@/lib/shipping/types";

function formatDate(value?: string | null) {
  if (!value) return "Salida sin definir";
  return new Intl.DateTimeFormat("es-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function modeLabel(mode: ShippingTrip["transport_mode"]) {
  return { air: "Aéreo", sea: "Marítimo", ground: "Terrestre", mixed: "Mixto", other: "Otro" }[mode];
}

function ModeIcon({ mode }: { mode: ShippingTrip["transport_mode"] }) {
  if (mode === "air") return <Plane size={20} />;
  if (mode === "sea") return <Ship size={20} />;
  return <Truck size={20} />;
}

export default function NewShipmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCustomerId = searchParams.get("customerId") || "";
  const initialRecipientId = searchParams.get("recipientId") || "";
  const requestedTripId = searchParams.get("tripId") || "";
  const { access, loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const [drivers, setDrivers] = useState<ShippingDriver[]>([]);
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [countries, setCountries] = useState<ShippingCountry[]>([]);
  const [provinces, setProvinces] = useState<ShippingProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<ShippingMunicipality[]>([]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ShippingServiceType[]>([]);
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [extraFees, setExtraFees] = useState<ShippingExtraFee[]>([]);
  const [openTrips, setOpenTrips] = useState<ShippingTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tripError, setTripError] = useState("");

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

  const directTripMode = Boolean(requestedTripId);

  const selectedTrip = useMemo(
    () => openTrips.find((trip) => trip.id === selectedTripId) || null,
    [openTrips, selectedTripId]
  );

  const backHref = directTripMode
    ? `/admin/shipping/trips/${encodeURIComponent(requestedTripId)}`
    : "/admin/shipping/shipments";

  useEffect(() => {
    async function loadData() {
      if (!activeStore?.id) {
        setLoadingConfig(false);
        return;
      }

      setLoadingConfig(true);
      setTripError("");

      const [driversResult, config, tripsResult, requestedTripResult] = await Promise.all([
        getShippingDriversByStoreId(activeStore.id),
        getShippingConfiguration(activeStore.id),
        getOpenShippingTripsByStoreId(activeStore.id),
        requestedTripId
          ? getShippingTripById(activeStore.id, requestedTripId)
          : Promise.resolve({ data: null, error: null }),
      ]);

      setDrivers(driversResult.data || []);
      setSettings(config.settings);
      setCountries(config.countries);
      setProvinces(config.provinces);
      setMunicipalities(config.municipalities);
      setLocations(config.locations);
      setServiceTypes(config.serviceTypes);
      setRates(config.rates);
      setExtraFees(config.extraFees);

      if (tripsResult.error) {
        setOpenTrips([]);
        setTripError(tripsResult.error.message || "No se pudieron cargar los viajes abiertos.");
      } else {
        const preparingTrips = tripsResult.data || [];
        const requestedTrip = requestedTripResult.data as ShippingTrip | null;
        const requestedTripIsUsable = Boolean(
          requestedTrip &&
            requestedTrip.is_active &&
            !["completed", "cancelled"].includes(requestedTrip.status)
        );

        if (requestedTripId && requestedTripResult.error) {
          setTripError(requestedTripResult.error.message || "No se pudo cargar el viaje seleccionado.");
          setOpenTrips(preparingTrips);
          setSelectedTripId("");
        } else if (requestedTripId && !requestedTripIsUsable) {
          setTripError("Este viaje está cerrado, cancelado o ya no está disponible para registrar envíos.");
          setOpenTrips(preparingTrips);
          setSelectedTripId("");
        } else {
          const trips = requestedTripIsUsable && requestedTrip
            ? [requestedTrip, ...preparingTrips.filter((trip) => trip.id !== requestedTrip.id)]
            : preparingTrips;
          setOpenTrips(trips);

          const defaultTrip = trips.find((trip) => trip.is_default);
          const automaticallySelected = requestedTripIsUsable
            ? requestedTrip
            : defaultTrip || (trips.length === 1 ? trips[0] : null);
          setSelectedTripId(automaticallySelected?.id || "");
        }
      }

      setLoadingConfig(false);
    }

    if (!accessLoading && !storeLoading) void loadData();
  }, [accessLoading, storeLoading, activeStore?.id, requestedTripId]);

  async function submit(input: ShipmentInput) {
    if (!activeStore?.id) throw new Error("No se pudo resolver la empresa.");
    if (!selectedTripId) throw new Error("Selecciona el viaje al que pertenece este envío.");

    setSubmitting(true);
    const { data, error } = await createShipment(
      activeStore.id,
      { ...input, trip_id: selectedTripId },
      access?.profile?.id
    );
    setSubmitting(false);

    if (error) throw new Error(error.message);

    const createdId = data?.id ? `?created=${encodeURIComponent(data.id)}` : "";
    router.push(`/admin/shipping/trips/${selectedTripId}${createdId}`);
    router.refresh();
  }

  if (accessLoading || storeLoading || loadingConfig) {
    return (
      <main className="p-10 text-center font-bold text-slate-500">
        <Loader2 className="mx-auto mb-3 animate-spin" />
        Preparando formulario y viajes abiertos...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href={backHref} className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2.5 text-sm font-black">
            <ArrowLeft size={18} /> Volver
          </Link>
          <Link href="/admin/shipping/settings" className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2.5 text-sm font-black">
            <Settings size={18} /> Ajustes de envíos
          </Link>
        </div>

        <div className="mb-6">
          <p className="text-sm font-black text-blue-700">Operaciones</p>
          <h1 className="text-3xl font-black text-[#061b3a]">Crear nuevo envío</h1>
          <p className="mt-2 font-semibold text-slate-500">
            {directTripMode
              ? "El envío se añadirá directamente al viaje desde el que llegaste."
              : "Selecciona uno de los viajes que todavía están preparando su salida."}
          </p>
        </div>

        {tripError && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{tripError}</div>}

        {openTrips.length === 0 || (directTripMode && !selectedTrip) ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm md:p-12">
            <Route className="mx-auto text-slate-300" size={54} />
            <h2 className="mt-4 text-2xl font-black text-slate-900">
              {directTripMode ? "Este viaje no admite nuevos envíos" : "No hay viajes abiertos"}
            </h2>
            <p className="mx-auto mt-2 max-w-xl font-semibold text-slate-500">
              {directTripMode
                ? tripError || "Regresa al viaje y comprueba que continúe activo."
                : "Crea un viaje en estado “Preparando salida” antes de registrar el paquete. Así nunca quedará un envío sin manifiesto."}
            </p>
            <Link href="/admin/shipping/trips/new" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#061b3a] px-6 py-3 font-black text-white">
              <Plus size={19} /> Crear viaje
            </Link>
          </section>
        ) : (
          <>
            {directTripMode && selectedTrip ? (
              <section className="mb-6 rounded-[2rem] border border-blue-200 bg-blue-50 p-5 shadow-sm md:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-700 text-white">
                    <ModeIcon mode={selectedTrip.transport_mode} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">Viaje asignado automáticamente</p>
                    <h2 className="mt-1 text-xl font-black text-slate-950">Viaje {selectedTrip.trip_number} · {selectedTrip.name}</h2>
                    <p className="mt-1 text-sm font-bold text-slate-600">
                      {modeLabel(selectedTrip.transport_mode)} · {selectedTrip.origin || "Origen sin definir"} → {selectedTrip.destination || "Destino sin definir"}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                      <CalendarDays size={14} /> {formatDate(selectedTrip.departure_date)}
                    </p>
                  </div>
                </div>
              </section>
            ) : (
            <section className="mb-6 rounded-[2rem] border border-blue-100 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">Viaje del envío</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Selecciona el viaje que recibirá este paquete</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Puedes tener varios viajes aéreos, marítimos o terrestres abiertos al mismo tiempo.</p>
                </div>
                <Link href="/admin/shipping/trips/new" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">
                  <Plus size={18} /> Otro viaje
                </Link>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {openTrips.map((trip) => {
                  const selected = selectedTripId === trip.id;
                  return (
                    <button
                      type="button"
                      key={trip.id}
                      onClick={() => setSelectedTripId(trip.id)}
                      className={`relative rounded-2xl border p-4 text-left transition ${selected ? "border-blue-600 bg-blue-50 ring-4 ring-blue-100" : "border-slate-200 bg-white hover:border-blue-300"}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                          <ModeIcon mode={trip.transport_mode} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-950">Viaje {trip.trip_number} · {trip.name}</p>
                            {trip.is_default && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase text-amber-800">Predeterminado</span>}
                          </div>
                          <p className="mt-1 text-sm font-bold text-slate-600">{modeLabel(trip.transport_mode)} · {trip.origin || "Origen sin definir"} → {trip.destination || "Destino sin definir"}</p>
                          <p className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500"><CalendarDays size={14} /> {formatDate(trip.departure_date)}</p>
                        </div>
                        {selected && <CheckCircle2 className="shrink-0 text-blue-700" size={22} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
            )}

            {selectedTrip ? (
              <div className="mb-5 rounded-2xl bg-[#061b3a] px-5 py-4 text-white">
                <p className="text-xs font-black uppercase tracking-[.16em] text-blue-200">Asignación confirmada</p>
                <p className="mt-1 font-black">Este envío se guardará en Viaje {selectedTrip.trip_number}: {selectedTrip.name}</p>
              </div>
            ) : (
              <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 font-black text-amber-800">Selecciona un viaje para habilitar el registro del envío.</div>
            )}

            <div className={selectedTripId ? "" : "pointer-events-none opacity-50"}>
              <ShipmentForm
                storeId={activeStore?.id || ""}
                drivers={drivers}
                settings={settings}
                countries={countries}
                provinces={provinces}
                municipalities={municipalities}
                locations={locations}
                serviceTypes={serviceTypes}
                rates={rates}
                extraFees={extraFees}
                initialCustomerId={initialCustomerId}
                initialRecipientId={initialRecipientId}
                submitting={submitting}
                onSubmit={submit}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
