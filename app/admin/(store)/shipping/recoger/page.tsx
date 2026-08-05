"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  MessageCircle,
  QrCode,
  Receipt,
  RefreshCcw,
  Smartphone,
  Tablet,
} from "lucide-react";

import ShipmentForm from "@/components/admin/shipping/ShipmentForm";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import { supabase } from "@/lib/supabase";
import { createShipment, getShippingDriversByStoreId } from "@/lib/services/shipping";
import { getShippingConfiguration } from "@/lib/services/shipping-settings";
import { getOpenShippingTripsByStoreId } from "@/lib/services/shipping-trips";
import { openWhatsAppMessage } from "@/lib/utils/whatsapp";
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
type CardMode = null | "choose" | "customer-link";

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
  const [payError, setPayError] = useState("");
  const [payBusy, setPayBusy] = useState<"cash" | "card" | null>(null);
  const [folio, setFolio] = useState<string | null>(null);

  // Cobro con tarjeta: en la tablet directamente, o en el teléfono del
  // cliente (WhatsApp / QR) — un solo link generado, sin duplicar cobros.
  const [cardMode, setCardMode] = useState<CardMode>(null);
  const [cardCheckoutUrl, setCardCheckoutUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Vuelta desde el Checkout de Stripe (cobro con tarjeta en la recogida).
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

  // Si venimos de vuelta del Checkout de Stripe abierto en esta misma
  // tablet, consultamos el estado real del envío (el webhook puede
  // tardar un instante en llegar).
  useEffect(() => {
    async function checkReturn() {
      if (!returningShipmentId || (!returningPaid && !returningCancelled)) return;

      if (returningCancelled) {
        setPayError("El cobro con tarjeta se canceló. Puedes intentarlo de nuevo o cobrar en efectivo.");
        return;
      }

      setPayBusy("card");
      const headers = await authHeaders();

      for (let attempt = 0; attempt < 5; attempt++) {
        const res = await fetch(`/api/admin/shipping/payment-status?shipmentId=${encodeURIComponent(returningShipmentId)}`, { headers });
        const json = await res.json().catch(() => ({}));

        if (json.paymentStatus === "paid") {
          setShipment({ id: returningShipmentId, trackingCode: json.trackingCode, servicePrice: Number(json.servicePrice || 0), customerPhone: "" });
          setFolio(json.folio || null);
          setStep("done");
          setPayBusy(null);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      setPayError("El pago con tarjeta todavía no se confirma. Espera unos segundos y actualiza, o revisa el Dashboard de Stripe.");
      setPayBusy(null);
    }

    void checkReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returningShipmentId, returningPaid, returningCancelled]);

  // Mientras se muestra el link para el teléfono del cliente (QR o
  // WhatsApp), revisamos cada pocos segundos si ya pagó, para que la
  // tablet pase sola a la pantalla de "Cobrado y listo".
  useEffect(() => {
    if (cardMode !== "customer-link" || !shipment) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    async function poll() {
      const headers = await authHeaders();
      const res = await fetch(`/api/admin/shipping/payment-status?shipmentId=${encodeURIComponent(shipment!.id)}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (json.paymentStatus === "paid") {
        setFolio(json.folio || null);
        setStep("done");
      }
    }

    pollRef.current = setInterval(() => void poll(), 4000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [cardMode, shipment]);

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

  async function payCash() {
    if (!shipment) return;
    setPayBusy("cash");
    setPayError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/shipping/mark-paid-cash", {
        method: "POST",
        headers,
        body: JSON.stringify({ shipmentId: shipment.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo marcar el pago en efectivo.");
      setFolio(json.folio || null);
      setStep("done");
    } catch (e) {
      setPayError((e as Error).message);
    } finally {
      setPayBusy(null);
    }
  }

  async function payCardOnTablet() {
    if (!shipment) return;
    setPayBusy("card");
    setPayError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/shipping/charge-card", {
        method: "POST",
        headers,
        body: JSON.stringify({ shipmentId: shipment.id, deliveryChannel: "tablet" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo iniciar el cobro con tarjeta.");
      window.location.href = json.url;
    } catch (e) {
      setPayError((e as Error).message);
      setPayBusy(null);
    }
  }

  async function generateCustomerLink() {
    if (!shipment) return;
    setPayBusy("card");
    setPayError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/admin/shipping/charge-card", {
        method: "POST",
        headers,
        body: JSON.stringify({ shipmentId: shipment.id, deliveryChannel: "customer" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "No se pudo generar el link de pago.");

      setCardCheckoutUrl(json.url);
      const dataUrl = await QRCode.toDataURL(json.url, { width: 320, margin: 1 });
      setQrDataUrl(dataUrl);
      setCardMode("customer-link");
    } catch (e) {
      setPayError((e as Error).message);
    } finally {
      setPayBusy(null);
    }
  }

  function sendCheckoutByWhatsApp() {
    if (!shipment || !cardCheckoutUrl) return;
    if (!shipment.customerPhone) {
      setPayError("No hay un teléfono guardado para este cliente — usa el QR en su lugar, o escríbelo a mano en WhatsApp.");
      return;
    }
    try {
      openWhatsAppMessage({
        app: "personal",
        phone: shipment.customerPhone,
        message: `Hola! Para completar el pago de tu envío ${shipment.trackingCode} (${currency(shipment.servicePrice)}) con Aguila Express USA, paga aquí con tu tarjeta: ${cardCheckoutUrl}`,
      });
    } catch (e) {
      setPayError((e as Error).message);
    }
  }

  function backToCardChoice() {
    setCardMode(null);
    setCardCheckoutUrl(null);
    setQrDataUrl(null);
    setPayError("");
  }

  function startAnother() {
    setStep("form");
    setShipment(null);
    setFolio(null);
    setPayError("");
    setCardMode(null);
    setCardCheckoutUrl(null);
    setQrDataUrl(null);
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

        {step === "payment" && shipment && cardMode !== "customer-link" && (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-10">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[.16em] text-blue-700">Envío {shipment.trackingCode} creado</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Cobrar {currency(shipment.servicePrice)}</h2>
              <p className="mt-2 font-semibold text-slate-500">
                {cardMode === "choose" ? "¿Dónde va a pagar con tarjeta?" : "Elige cómo te está pagando el cliente ahora mismo."}
              </p>
            </div>

            {payError && <div className="mx-auto mt-5 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center font-bold text-rose-700">{payError}</div>}

            {cardMode !== "choose" ? (
              <div className="mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={payCash}
                  disabled={payBusy !== null}
                  className="flex flex-col items-center gap-3 rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-8 text-emerald-800 transition hover:border-emerald-400 disabled:opacity-50"
                >
                  {payBusy === "cash" ? <Loader2 size={40} className="animate-spin" /> : <Banknote size={40} />}
                  <span className="text-lg font-black">Efectivo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCardMode("choose")}
                  disabled={payBusy !== null}
                  className="flex flex-col items-center gap-3 rounded-3xl border-2 border-blue-200 bg-blue-50 p-8 text-blue-800 transition hover:border-blue-400 disabled:opacity-50"
                >
                  <CreditCard size={40} />
                  <span className="text-lg font-black">Tarjeta</span>
                </button>
              </div>
            ) : (
              <div className="mx-auto mt-8 max-w-xl">
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={payCardOnTablet}
                    disabled={payBusy !== null}
                    className="flex flex-col items-center gap-3 rounded-3xl border-2 border-blue-200 bg-blue-50 p-8 text-blue-800 transition hover:border-blue-400 disabled:opacity-50"
                  >
                    {payBusy === "card" ? <Loader2 size={36} className="animate-spin" /> : <Tablet size={36} />}
                    <span className="text-center text-base font-black">En esta tablet</span>
                    <span className="text-center text-xs font-semibold text-blue-700/70">El cliente teclea su tarjeta aquí mismo.</span>
                  </button>

                  <button
                    type="button"
                    onClick={generateCustomerLink}
                    disabled={payBusy !== null}
                    className="flex flex-col items-center gap-3 rounded-3xl border-2 border-violet-200 bg-violet-50 p-8 text-violet-800 transition hover:border-violet-400 disabled:opacity-50"
                  >
                    {payBusy === "card" ? <Loader2 size={36} className="animate-spin" /> : <Smartphone size={36} />}
                    <span className="text-center text-base font-black">En su teléfono</span>
                    <span className="text-center text-xs font-semibold text-violet-700/70">Le mandas el link por WhatsApp o escanea un QR.</span>
                  </button>
                </div>

                <button type="button" onClick={() => setCardMode(null)} className="mx-auto mt-5 flex items-center gap-2 text-sm font-bold text-slate-500">
                  <ArrowLeft size={16} /> Volver
                </button>
              </div>
            )}

            <p className="mt-8 text-center text-sm font-semibold text-slate-400">
              También puedes dejarlo pendiente y cobrarlo después desde el panel — solo cierra esta pantalla.
            </p>
          </section>
        )}

        {step === "payment" && shipment && cardMode === "customer-link" && (
          <section className="rounded-[2rem] border border-violet-200 bg-white p-6 shadow-sm md:p-10">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[.16em] text-violet-700">Envío {shipment.trackingCode}</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Pago desde su teléfono — {currency(shipment.servicePrice)}</h2>
              <p className="mt-2 font-semibold text-slate-500">
                Esta pantalla se actualiza sola en cuanto el cliente termine de pagar.
              </p>
            </div>

            {payError && <div className="mx-auto mt-5 max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center font-bold text-rose-700">{payError}</div>}

            <div className="mx-auto mt-8 flex max-w-xs flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrDataUrl} alt="Código QR para pagar" className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-2" />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-dashed border-slate-300">
                  <QrCode size={40} className="text-slate-300" />
                </div>
              )}
              <p className="text-center text-xs font-bold uppercase tracking-wide text-slate-400">Que el cliente escanee con la cámara de su teléfono</p>
            </div>

            <div className="mx-auto mt-6 flex max-w-xs flex-col gap-3">
              <button
                type="button"
                onClick={sendCheckoutByWhatsApp}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                <MessageCircle size={18} /> Enviar por WhatsApp
              </button>

              <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-3 text-center text-xs font-semibold text-slate-400">
                <Loader2 size={14} className="animate-spin" /> Esperando confirmación de pago...
              </div>

              <button type="button" onClick={backToCardChoice} className="mx-auto mt-2 flex items-center gap-2 text-sm font-bold text-slate-500">
                <ArrowLeft size={16} /> Volver a las opciones de cobro
              </button>
            </div>
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
