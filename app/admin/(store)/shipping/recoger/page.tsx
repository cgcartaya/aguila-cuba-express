"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Receipt,
  RefreshCcw,
} from "lucide-react";

import PaymentCollectPanel from "@/components/admin/shipping/PaymentCollectPanel";
import ShipmentForm from "@/components/admin/shipping/ShipmentForm";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/lib/supabase";
import { createShipment, getShippingDriversByStoreId } from "@/lib/services/shipping";
import { getShippingConfiguration } from "@/lib/services/shipping-settings";
import { getOpenShippingTripsByStoreId } from "@/lib/services/shipping-trips";
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

type Step = "form" | "payment" | "done";

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${data.session?.access_token || ""}`, "Content-Type": "application/json" };
}

function currency(value: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

export default function PickupShipmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { access, loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

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
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [configError, setConfigError] = useState("");

  const [step, setStep] = useState<Step>("form");
  const [shipment, setShipment] = useState<{ id: string; trackingCode: string; servicePrice: number; customerPhone: string } | null>(null);
  const [returnPollError, setReturnPollError] = useState("");
  const [folio, setFolio] = useState<string | null>(null);

  // Vuelta desde el Checkout de Stripe (cobro con tarjeta en este mismo
  // dispositivo, desde este flujo o desde el botón "Cobrar" de otra
  // pantalla que haya usado la opción "En este dispositivo").
  const returningShipmentId = searchParams.get("shipment");
  const returningPaid = searchParams.get("cobrado");
  const returningCancelled = searchParams.get("cancelado");

  useEffect(() => {
    async function loadData() {
      if (!activeStore?.id) {
        setLoadingConfig(false);
        return;
      }

      setLoadingConfig(true);
      setConfigError("");

      const [driversResult, config, tripsResult] = await Promise.all([
        getShippingDriversByStoreId(activeStore.id),
        getShippingConfiguration(activeStore.id),
        getOpenShippingTripsByStoreId(activeStore.id),
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
        setConfigError(tripsResult.error.message || "No se pudieron cargar los viajes abiertos.");
      } else {
        setOpenTrips(tripsResult.data || []);
      }

      setLoadingConfig(false);
    }

    if (!accessLoading && !storeLoading) void loadData();
  }, [accessLoading, storeLoading, activeStore?.id]);

  useEffect(() => {
    async function checkReturn() {
      if (!returningShipmentId || (!returningPaid && !returningCancelled)) return;

      if (returningCancelled) {
        setReturnPollError("El cobro con tarjeta se canceló. Vuelve a intentarlo desde el envío.");
        return;
      }

      const headers = await authHeaders();

      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch(`/api/admin/shipping/payment-status?shipmentId=${encodeURIComponent(returningShipmentId)}`, { headers });
        const json = await res.json().catch(() => ({}));

        if (json.paymentStatus === "paid") {
          setShipment({ id: returningShipmentId, trackingCode: json.trackingCode, servicePrice: Number(json.servicePrice || 0), customerPhone: "" });
          setFolio(json.folio || null);
          setStep("done");
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setReturnPollError("El pago con tarjeta todavía no se confirma. Espera unos segundos y actualiza, o revisa el Dashboard de Stripe.");
    }

    void checkReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returningShipmentId, returningPaid, returningCancelled]);

  async function submit(input: ShipmentInput) {
    if (!activeStore?.id) throw new Error("No se pudo resolver la empresa.");

    // En recogida no obligamos a elegir viaje: se usa el predeterminado, o
    // el que salga más pronto — igual que hacía la pantalla completa
    // antes de que el usuario tocara nada.
    const defaultTrip = openTrips.find((trip) => trip.is_default) || openTrips[0];
    if (!defaultTrip) throw new Error("No hay ningún viaje abierto todavía. Crea uno desde el panel completo antes de recoger paquetes.");

    setSubmitting(true);
    try {
      const { data, error } = await createShipment(activeStore.id, { ...input, trip_id: defaultTrip.id }, access?.profile?.id);
      if (error) throw new Error(error.message);
      if (!data?.id) throw new Error("El envío se creó sin devolver un identificador válido.");

      setShipment({
        id: data.id,
        trackingCode: data.tracking_code || data.id,
        servicePrice: Number(data.service_price || 0),
        customerPhone: input.sender_phone || "",
      });
      setStep("payment");
    } finally {
      setSubmitting(false);
    }
  }

  function startAnother() {
    setStep("form");
    setShipment(null);
    setFolio(null);
    setReturnPollError("");
    router.replace("/admin/shipping/recoger");
  }

  if (accessLoading || storeLoading || loadingConfig) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-10 text-center font-bold text-slate-500">
        <Loader2 className="mr-3 animate-spin" /> Preparando la pantalla de recogida...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 pb-24 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/admin/shipping/shipments" className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 text-sm font-black">
            <ArrowLeft size={18} /> Volver al panel
          </Link>
          <p className="text-sm font-black text-blue-700">Recogida en casa</p>
        </div>

        {configError && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{configError}</div>}
        {returnPollError && <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">{returnPollError}</div>}

        {step === "form" && (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-black text-[#061b3a]">Nuevo envío en recogida</h1>
              <p className="mt-2 font-semibold text-slate-500">
                Busca al cliente, completa el envío y cobra al instante — todo en esta pantalla.
              </p>
            </div>

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
              submitting={submitting}
              onSubmit={submit}
            />
          </>
        )}

        {step === "payment" && shipment && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-10">
            <PaymentCollectPanel
              shipment={shipment}
              onPaid={(receivedFolio) => {
                setFolio(receivedFolio);
                setStep("done");
              }}
            />

            <p className="mt-8 text-center text-sm font-semibold text-slate-400">
              También puedes dejarlo pendiente y cobrarlo después desde el panel — solo cierra esta pantalla.
            </p>
          </section>
        )}

        {step === "done" && shipment && (
          <section className="rounded-[2rem] border border-emerald-200 bg-white p-6 text-center shadow-sm md:p-10">
            <CheckCircle2 className="mx-auto text-emerald-600" size={56} />
            <h2 className="mt-4 text-3xl font-black text-slate-950">Cobrado y listo</h2>
            <p className="mt-2 font-semibold text-slate-500">
              Envío {shipment.trackingCode} · {currency(shipment.servicePrice)}
            </p>

            <div className="mx-auto mt-8 grid max-w-lg gap-4 sm:grid-cols-2">
              <Link
                href={`/factura/${encodeURIComponent(shipment.trackingCode)}`}
                target="_blank"
                className="flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white"
              >
                <FileText size={18} /> Ver factura
              </Link>

              {folio ? (
                <Link
                  href={`/recibo/${encodeURIComponent(folio)}`}
                  target="_blank"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-800"
                >
                  <Receipt size={18} /> Ver recibo de pago
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-400">
                  Recibo no disponible
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={startAnother}
              className="mx-auto mt-8 flex items-center gap-2 rounded-2xl border bg-white px-6 py-3 text-sm font-black text-slate-700"
            >
              <RefreshCcw size={18} /> Registrar otra recogida
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
