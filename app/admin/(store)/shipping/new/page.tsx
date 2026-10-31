"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Route,
  Settings,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { resolveOperationTrip, type ShipmentOperationType } from "@/lib/shipping/operation-mode";
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
  const [operationType, setOperationType] = useState<ShipmentOperationType>(searchParams.get("type") === "money" ? "money" : "package");
  const requiresTrip = operationType !== "money";
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
    const tripId = resolveOperationTrip(input, selectedTripId);

    setSubmitting(true);
    try {
      const { data, error } = await createShipment(
        activeStore.id,
        { ...input, trip_id: tripId },
        access?.profile?.id
      );

      if (error) throw new Error(error.message);
      if (!data?.id) throw new Error("El envío se creó sin devolver un identificador válido.");
      if (data.trip_id !== tripId) {
        throw new Error("El envío se creó, pero no quedó vinculado al viaje seleccionado.");
      }

      router.push(tripId ? `/admin/shipping/trips/${tripId}?created=${encodeURIComponent(data.id)}` : `/admin/shipping/shipments?content=money&created=${encodeURIComponent(data.id)}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (accessLoading || storeLoading || loadingConfig) {
    return (
      <main className="p-10 text-center font-bold text-slate-500">
        <Loader2 className="mx-auto mb-3 animate-spin" />
        Preparando formulario y viajes abiertos...
      </main>
    );
  }

  return <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-6"><div className="mx-auto max-w-6xl">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Link href={backHref} className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2.5 text-sm font-black"><ArrowLeft size={18} /> Volver</Link>
      <Link href="/admin/shipping/settings" className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2.5 text-sm font-black"><Settings size={18} /> Ajustes de envíos</Link>
    </div>
    <div className="mb-6"><p className="text-sm font-black text-blue-700">Operaciones</p><h1 className="text-3xl font-black text-[#061b3a]">Crear nuevo envío</h1></div>
    <section className="mb-6 rounded-[2rem] border bg-white p-5 shadow-sm">
      <h2 className="text-xl font-black">¿Qué deseas registrar?</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{([
        ['package', 'Paquete', 'Requiere un viaje'],
        ['money', 'Envío de dinero', 'Entrega local sin viaje'],
        ['mixed', 'Paquete y dinero', 'Operación mixta con viaje'],
      ] as const).map(([type, title, description]) => <button type="button" key={type} aria-pressed={operationType === type} onClick={() => setOperationType(type)} className={`rounded-2xl border p-4 text-left ${operationType === type ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200'}`}><b className="block">{title}</b><span className="mt-1 block text-sm text-slate-500">{description}</span></button>)}</div>
    </section>
    {!requiresTrip && <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"><h2 className="font-black">Envío de dinero sin viaje</h2><p className="mt-1 text-sm">Registra el monto y la comisión, asigna un repartidor y gestiona la entrega. La operación tendrá su número y factura en la lista general.</p></section>}
    {requiresTrip && <>
      {tripError && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{tripError}</div>}
      {openTrips.length === 0 || (directTripMode && !selectedTrip) ? <section className="mb-6 rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
        <Route className="mx-auto text-slate-300" size={48} /><h2 className="mt-3 text-xl font-black">{directTripMode ? 'Este viaje no admite nuevos envíos' : 'No hay viajes abiertos'}</h2>
        <p className="mt-2 text-slate-500">Crea un viaje abierto para registrar paquetes. Los envíos de dinero pueden registrarse sin viaje.</p>
        <Link href="/admin/shipping/trips/new" className="mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-3 font-bold"><Plus size={18} /> Crear viaje</Link>
      </section> : <section className="mb-6 rounded-[2rem] border bg-white p-5 shadow-sm">
        <h2 className="text-xl font-black">Viaje del paquete</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{(directTripMode && selectedTrip ? [selectedTrip] : openTrips).map(trip => <button type="button" key={trip.id} onClick={() => setSelectedTripId(trip.id)} aria-pressed={selectedTripId === trip.id} className={`rounded-2xl border p-4 text-left ${selectedTripId === trip.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between gap-3"><b>Viaje {trip.trip_number} · {trip.name}</b>{selectedTripId === trip.id && <CheckCircle2 size={20} className="text-blue-700" />}</div>
          <p className="mt-2 text-sm text-slate-600">{modeLabel(trip.transport_mode)} · {trip.origin || 'Origen sin definir'} → {trip.destination || 'Destino sin definir'}</p><p className="mt-1 text-xs text-slate-500">{formatDate(trip.departure_date)}</p>
        </button>)}</div>
        {!directTripMode && <Link href="/admin/shipping/trips/new" className="mt-4 inline-flex items-center gap-2 font-bold text-blue-700"><Plus size={18} /> Otro viaje</Link>}
      </section>}
      {!selectedTrip && <p className="mb-5 rounded-2xl bg-amber-50 p-4 font-bold text-amber-800">Selecciona un viaje para habilitar el registro del paquete.</p>}
    </>}
    <fieldset disabled={requiresTrip && !selectedTrip} className={requiresTrip && !selectedTrip ? 'opacity-50' : ''}>
      <ShipmentForm operationType={operationType} storeId={activeStore?.id || ''} drivers={drivers} settings={settings} countries={countries} provinces={provinces} municipalities={municipalities} locations={locations} serviceTypes={serviceTypes} rates={rates} extraFees={extraFees} initialCustomerId={initialCustomerId} initialRecipientId={initialRecipientId} submitting={submitting} onSubmit={submit} />
    </fieldset>
  </div></main>;
}
