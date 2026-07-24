"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import CityAutocomplete from "./CityAutocomplete";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Package,
  Route,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from "lucide-react";

const STORE_SLUG = "yoyo-envios";

type AddressValidation = {
  valid: boolean;
  verified: boolean;
  inCoverage: boolean;
  message: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  region: string;
  regionCode: string;
  postalCode: string;
  countryCode: string;
  suggestedZoneName: string | null;
};

type RequestedRoute = { id: string; name: string; date: string };

type PickupPublicConfig = {
  countryCode: string;
  countryName: string | null;
  regionCode: string;
  regionName: string;
  coverageMode: string;
  maxPreferredDates: number;
  cities: string[];
};

function nextDays(count = 8) {
  const days: Array<{ iso: string; weekday: string; day: string; month: string }> = [];
  const weekday = new Intl.DateTimeFormat("es-US", { weekday: "short" });
  const month = new Intl.DateTimeFormat("es-US", { month: "short" });

  for (let offset = 1; offset <= 16 && days.length < count; offset += 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    if (date.getDay() === 0) continue;

    days.push({
      iso: date.toISOString().slice(0, 10),
      weekday: weekday.format(date).replace(".", ""),
      day: String(date.getDate()),
      month: month.format(date).replace(".", ""),
    });
  }

  return days;
}

export default function PickupPlannerHero() {
  const days = useMemo(() => nextDays(), []);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [form, setForm] = useState({
    address_line_1: "",
    address_line_2: "",
    city: "",
    region: "",
    postal_code: "",
    customer_name: "",
    phone: "",
    email: "",
    package_count: "1",
    package_type: "Cajas y misceláneas",
    estimated_weight: "",
    needs_box: false,
    needs_packing_help: false,
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [addressResult, setAddressResult] = useState<AddressValidation | null>(null);
  const [error, setError] = useState("");
  const [successCode, setSuccessCode] = useState("");
  const [config, setConfig] = useState<PickupPublicConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [requestedRoute, setRequestedRoute] = useState<RequestedRoute | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleOpenPlanner(event: Event) {
      const detail = (event as CustomEvent<{ city?: string; routeId?: string; routeName?: string; routeDate?: string }>).detail || {};
      setError("");
      setSuccessCode("");
      setStep(1);
      if (detail.city) setForm((current) => ({ ...current, city: detail.city || current.city }));
      if (detail.routeId && detail.routeName && detail.routeDate) {
        setRequestedRoute({ id: detail.routeId, name: detail.routeName, date: detail.routeDate });
        setSelectedDates([detail.routeDate]);
      } else {
        setRequestedRoute(null);
      }
      setDrawerOpen(true);
    }

    window.addEventListener("open-pickup-planner", handleOpenPlanner);
    return () => window.removeEventListener("open-pickup-planner", handleOpenPlanner);
  }, []);


  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`/api/pickups/config?store_slug=${encodeURIComponent(STORE_SLUG)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "No pudimos cargar la cobertura.");
        setConfig(result);
        setForm((current) => ({ ...current, region: result.regionName || result.regionCode || "" }));
      } catch (configError) {
        setError(configError instanceof Error ? configError.message : "No pudimos cargar las ciudades.");
      } finally {
        setConfigLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      html.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [drawerOpen]);

  function update(name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
    if (["address_line_1", "city", "region", "postal_code"].includes(name)) setAddressResult(null);
  }

  function openPlanner() {
    setError("");
    setDrawerOpen(true);
  }

  function closePlanner() {
    setDrawerOpen(false);
  }

  function resetPlanner() {
    setStep(1);
    setSelectedDates([]);
    setAddressResult(null);
    setSuccessCode("");
    setError("");
    setRequestedRoute(null);
    setForm((current) => ({
      ...current,
      address_line_1: "",
      address_line_2: "",
      city: "",
      postal_code: "",
      customer_name: "",
      phone: "",
      email: "",
      package_count: "1",
      package_type: "Cajas y misceláneas",
      estimated_weight: "",
      needs_box: false,
      needs_packing_help: false,
      notes: "",
    }));
  }

  async function validateAddress() {
    setValidating(true);
    setError("");
    try {
      const response = await fetch("/api/pickups/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_slug: STORE_SLUG,
          address_line_1: form.address_line_1,
          city: form.city,
          region: form.region,
          postal_code: form.postal_code,
          country_code: config?.countryCode || "US",
        }),
      });
      const result = await response.json();
      if (!response.ok && !result?.message) throw new Error(result.error || "No pudimos validar la dirección.");
      setAddressResult(result);

      if (result.valid) {
        setForm((current) => ({
          ...current,
          address_line_1: result.addressLine1 || current.address_line_1,
          city: result.city || current.city,
          region: result.region || current.region,
          postal_code: result.postalCode || current.postal_code,
        }));
      } else {
        setError(result.message || "Revisa la dirección.");
      }
      return Boolean(result.valid);
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "No pudimos validar la dirección.");
      return false;
    } finally {
      setValidating(false);
    }
  }

  function toggleDate(date: string) {
    setSelectedDates((current) => {
      if (current.includes(date)) return current.filter((item) => item !== date);
      const maximum = Math.max(1, config?.maxPreferredDates || 3);
      if (current.length >= maximum) return [...current.slice(1), date];
      return [...current, date];
    });
  }

  async function continueLocation() {
    setError("");
    if (!form.city) {
      setError("Selecciona una ciudad de la lista.");
      return;
    }
    if (form.address_line_1.trim().length < 5) {
      setError("Escribe la dirección donde debemos recoger.");
      return;
    }
    if (form.postal_code.trim().length < 5) {
      setError("Escribe un código postal válido.");
      return;
    }

    const addressOk = addressResult?.valid || (await validateAddress());
    if (addressOk) setStep(2);
  }

  function continueDates() {
    setError("");
    if (selectedDates.length === 0) {
      setError("Selecciona al menos un día que te convenga.");
      return;
    }
    setStep(3);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.customer_name.trim() || form.phone.replace(/\D/g, "").length < 7) {
      setError("Escribe tu nombre y un teléfono válido.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_slug: STORE_SLUG,
          ...form,
          preferred_dates: selectedDates,
          package_count: Number(form.package_count) || 1,
          estimated_weight: form.estimated_weight ? Number(form.estimated_weight) : null,
          country_code: config?.countryCode || "US",
          requested_route_id: requestedRoute?.id || null,
          requested_route_name: requestedRoute?.name || null,
          requested_route_date: requestedRoute?.date || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos registrar la solicitud.");
      setSuccessCode(result.request_code);
      setStep(4);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = ["Ubicación", "Fechas", "Detalles"];

  return (
    <>
      <section className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-white via-blue-50 to-blue-100 p-6 text-slate-950 shadow-[0_35px_90px_rgba(0,0,0,.32)] sm:p-8">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-blue-600/10" />
        <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-red-500/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-red-600">
            <Truck size={16} /> Recogida a domicilio
          </div>
          <h2 className="mt-4 max-w-xl text-3xl font-black tracking-tight text-[#061b3a] sm:text-4xl">
            Recogemos en tu puerta.
          </h2>
          <p className="mt-3 max-w-xl text-base font-semibold leading-7 text-slate-600">
            Dinos dónde estás y qué días te convienen. Nosotros organizamos la ruta y confirmamos por WhatsApp.
          </p>

          <button
            type="button"
            onClick={openPlanner}
            className="mt-7 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-[0_18px_45px_rgba(15,23,42,.12)] transition hover:-translate-y-0.5 hover:border-blue-300 sm:p-5"
          >
            <span className="flex min-w-0 items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <MapPin size={24} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-black uppercase tracking-[0.12em] text-slate-500">Comienza aquí</span>
                <span className="mt-1 block truncate text-base font-black text-[#061b3a] sm:text-lg">Escribe tu ciudad y dirección</span>
              </span>
            </span>
            <ChevronRight className="shrink-0 text-blue-700" size={24} />
          </button>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3.5">
              <ShieldCheck className="text-emerald-600" size={20} />
              <span className="text-sm font-black text-slate-700">Solicitud segura</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3.5">
              <Route className="text-blue-700" size={20} />
              <span className="text-sm font-black text-slate-700">Ruta flexible</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/70 p-3.5">
              <Sparkles className="text-amber-500" size={20} />
              <span className="text-sm font-black text-slate-700">Confirmación rápida</span>
            </div>
          </div>
        </div>
      </section>

      {mounted && drawerOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex h-[100dvh] w-screen justify-end overflow-hidden bg-slate-950/70 backdrop-blur-sm overscroll-none"
          role="dialog"
          aria-modal="true"
          aria-label="Programar recogida"
        >
          <button type="button" onClick={closePlanner} className="absolute inset-0 cursor-default" aria-label="Cerrar formulario" />

          <div className="relative flex h-[100dvh] max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-l-[2rem]">
            <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">Yoyo Envíos</p>
                <h2 className="mt-1 text-xl font-black text-[#061b3a] sm:text-2xl">Programa tu recogida</h2>
              </div>
              <button type="button" onClick={closePlanner} className="rounded-full border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" aria-label="Cerrar">
                <X size={22} />
              </button>
            </header>

            {step < 4 && (
              <div className="border-b border-slate-100 px-5 py-4 sm:px-8">
                <div className="grid grid-cols-3 gap-2">
                  {stepLabels.map((label, index) => {
                    const number = index + 1;
                    const active = step === number;
                    const completed = step > number;
                    return (
                      <div key={label} className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${completed ? "bg-emerald-600 text-white" : active ? "bg-[#082b5c] text-white" : "bg-slate-100 text-slate-400"}`}>
                          {completed ? <Check size={15} /> : number}
                        </span>
                        <span className={`hidden text-sm font-black sm:block ${active ? "text-[#082b5c]" : "text-slate-400"}`}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain px-5 py-6 [scroll-padding-bottom:9rem] [-webkit-overflow-scrolling:touch] sm:px-8 sm:py-8">
              {requestedRoute && step < 4 && (
                <div className="mx-auto mb-6 max-w-xl rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">Reserva vinculada a una ruta</p>
                  <p className="mt-1 font-black text-[#061b3a]">{requestedRoute.name}</p>
                  <p className="mt-1 text-sm font-semibold text-blue-800">Fecha programada: {new Intl.DateTimeFormat("es-US", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${requestedRoute.date}T12:00:00`))}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">La agencia confirmará que todavía exista disponibilidad antes de añadir tu parada.</p>
                </div>
              )}
              {step === 1 && (
                <div className="mx-auto max-w-xl">
                  <h3 className="text-2xl font-black text-slate-950">¿Dónde recogemos?</h3>
                  <p className="mt-2 text-base font-medium text-slate-500">Primero selecciona tu ciudad. Después escribe la dirección exacta.</p>

                  <div className="mt-7 space-y-5">
                    <CityAutocomplete
                      cities={config?.cities || []}
                      value={form.city}
                      onChange={(city) => update("city", city)}
                      disabled={configLoading || !config?.cities?.length}
                      loading={configLoading}
                    />

                    <div>
                      <label className="mb-2 block text-sm font-black text-slate-800">Dirección</label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={20} />
                        <input
                          value={form.address_line_1}
                          onChange={(event) => update("address_line_1", event.target.value)}
                          placeholder="Ej. 1500 Main St"
                          autoComplete="street-address"
                          className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-black text-slate-800">Apartamento o unidad <span className="font-medium text-slate-400">(opcional)</span></label>
                        <input
                          value={form.address_line_2}
                          onChange={(event) => update("address_line_2", event.target.value)}
                          placeholder="Apt 4B"
                          className="min-h-14 w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-black text-slate-800">ZIP Code</label>
                        <input
                          value={form.postal_code}
                          onChange={(event) => update("postal_code", event.target.value)}
                          placeholder="29201"
                          autoComplete="postal-code"
                          inputMode="numeric"
                          className="min-h-14 w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base font-bold outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-blue-50 px-4 py-3.5 text-sm font-bold text-blue-950">
                      <ShieldCheck className="shrink-0 text-blue-700" size={20} />
                      Cobertura configurada para {form.region || "la región seleccionada"}.
                    </div>

                    {addressResult?.valid && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={21} />
                          <div>
                            <p className="font-black text-emerald-800">{addressResult.message}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-600">{addressResult.formattedAddress}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="mx-auto max-w-xl">
                  <button type="button" onClick={() => setStep(1)} className="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-slate-900">
                    <ArrowLeft size={18} /> Cambiar ubicación
                  </button>
                  <h3 className="text-2xl font-black text-slate-950">¿Qué días te convienen?</h3>
                  <p className="mt-2 text-base font-medium text-slate-500">{requestedRoute ? "La fecha de la ruta ya está seleccionada. Puedes añadir otras opciones por si fuera necesario." : `Selecciona hasta ${config?.maxPreferredDates || 3} opciones. Yoyo confirmará el día definitivo.`}</p>

                  <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {days.map((item) => {
                      const selected = selectedDates.includes(item.iso);
                      return (
                        <button
                          key={item.iso}
                          type="button"
                          onClick={() => toggleDate(item.iso)}
                          className={`relative rounded-2xl border p-4 text-left transition ${selected ? "border-red-600 bg-red-600 text-white shadow-lg" : "border-slate-200 bg-white text-slate-950 hover:border-blue-400 hover:bg-blue-50"}`}
                        >
                          {selected && <Check className="absolute right-3 top-3" size={18} />}
                          <span className="block text-xs font-black uppercase tracking-[0.12em] opacity-75">{item.weekday}</span>
                          <span className="mt-3 block text-3xl font-black">{item.day}</span>
                          <span className="block text-sm font-black capitalize opacity-75">{item.month}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="flex items-center gap-2 font-black text-slate-900"><CalendarDays className="text-blue-700" size={19} /> Fechas seleccionadas: {selectedDates.length}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">La fecha final depende de la ruta organizada para tu zona.</p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <form id="pickup-details-form" onSubmit={submit} className="mx-auto max-w-xl">
                  <button type="button" onClick={() => setStep(2)} className="mb-5 inline-flex items-center gap-2 text-sm font-black text-slate-500 hover:text-slate-900">
                    <ArrowLeft size={18} /> Cambiar fechas
                  </button>
                  <h3 className="text-2xl font-black text-slate-950">Cuéntanos sobre la recogida</h3>
                  <p className="mt-2 text-base font-medium text-slate-500">Con estos datos Yoyo podrá contactarte y organizar la ruta.</p>

                  <div className="mt-7 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-black text-slate-800">Nombre y apellidos</label>
                        <input value={form.customer_name} onChange={(event) => update("customer_name", event.target.value)} placeholder="Tu nombre" className="min-h-14 w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-black text-slate-800">Teléfono / WhatsApp</label>
                        <input value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="803 262 3676" inputMode="tel" className="min-h-14 w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-black text-slate-800">Tipo de artículos</label>
                        <select value={form.package_type} onChange={(event) => update("package_type", event.target.value)} className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-base font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100">
                          <option>Cajas y misceláneas</option>
                          <option>Electrodomésticos</option>
                          <option>Equipos electrónicos</option>
                          <option>Bicicleta</option>
                          <option>Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-black text-slate-800">Cantidad de paquetes</label>
                        <input value={form.package_count} onChange={(event) => update("package_count", event.target.value)} type="number" min="1" max="99" className="min-h-14 w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => update("needs_box", !form.needs_box)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-black transition ${form.needs_box ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 hover:bg-slate-50"}`}>
                        <Box size={22} /> Necesito caja
                      </button>
                      <button type="button" onClick={() => update("needs_packing_help", !form.needs_packing_help)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-black transition ${form.needs_packing_help ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 hover:bg-slate-50"}`}>
                        <Package size={22} /> Ayuda para empacar
                      </button>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-black text-slate-800">Notas <span className="font-medium text-slate-400">(opcional)</span></label>
                      <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Detalles que debamos conocer" rows={3} className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-base font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" />
                    </div>
                  </div>
                </form>
              )}

              {step === 4 && (
                <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <CheckCircle2 size={46} />
                  </div>
                  <h3 className="mt-6 text-3xl font-black text-[#061b3a]">¡Solicitud recibida!</h3>
                  <p className="mt-3 max-w-md text-base font-semibold leading-7 text-slate-600">Yoyo organizará la ruta y te confirmará el día definitivo por WhatsApp.</p>
                  <div className="mt-6 w-full max-w-sm rounded-2xl bg-slate-950 px-5 py-5 text-white">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">Código de solicitud</p>
                    <p className="mt-2 text-3xl font-black">{successCode}</p>
                  </div>
                  <button type="button" onClick={() => { resetPlanner(); closePlanner(); }} className="mt-6 rounded-2xl border border-slate-300 px-5 py-3 font-black text-slate-700 hover:bg-slate-50">Cerrar</button>
                </div>
              )}

              {error && step < 4 && (
                <p className="mx-auto mt-5 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>
              )}
            </div>

            {step < 4 && (
              <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-4">
                <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
                  <p className="hidden text-sm font-semibold text-slate-500 sm:block">Paso {step} de 3</p>
                  {step === 1 && (
                    <button type="button" onClick={continueLocation} disabled={validating} className="ml-auto flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#082b5c] px-6 font-black text-white transition hover:bg-[#0a3978] disabled:opacity-60">
                      {validating ? <Loader2 className="animate-spin" size={19} /> : <ArrowRight size={19} />} Continuar
                    </button>
                  )}
                  {step === 2 && (
                    <button type="button" onClick={continueDates} className="ml-auto flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 font-black text-white transition hover:bg-red-700">
                      Continuar <ArrowRight size={19} />
                    </button>
                  )}
                  {step === 3 && (
                    <button type="submit" form="pickup-details-form" disabled={loading} className="ml-auto flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 font-black text-white transition hover:bg-red-700 disabled:opacity-60">
                      {loading ? <Loader2 className="animate-spin" size={19} /> : <Truck size={19} />} Enviar solicitud
                    </button>
                  )}
                </div>
              </footer>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
