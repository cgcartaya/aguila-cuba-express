"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Route,
  Search,
  Sparkles,
  Truck,
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

function nextDays(count = 7) {
  const days: Array<{ iso: string; day: string; date: string }> = [];
  const formatterDay = new Intl.DateTimeFormat("es-US", { weekday: "short" });
  const formatterDate = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short" });
  for (let offset = 1; offset <= 14 && days.length < count; offset += 1) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    if (date.getDay() === 0) continue;
    days.push({
      iso: date.toISOString().slice(0, 10),
      day: formatterDay.format(date).replace(".", ""),
      date: formatterDate.format(date),
    });
  }
  return days;
}

export default function PickupPlannerHero() {
  const days = useMemo(() => nextDays(), []);
  const [step, setStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [form, setForm] = useState({
    address_line_1: "",
    city: "",
    region: "South Carolina",
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

  function update(name: string, value: string | boolean) {
    setForm((current) => ({ ...current, [name]: value }));
    if (["address_line_1", "city", "region", "postal_code"].includes(name)) setAddressResult(null);
  }

  useEffect(() => {
    if (step !== 1) return;
    if (form.address_line_1.trim().length < 5 || form.city.trim().length < 2 || form.region.trim().length < 2 || form.postal_code.trim().length < 5) return;
    const timer = window.setTimeout(() => validateAddress(false), 700);
    return () => window.clearTimeout(timer);
  }, [form.address_line_1, form.city, form.region, form.postal_code, step]);

  async function validateAddress(showError = true) {
    setValidating(true);
    if (showError) setError("");
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
          country_code: "US",
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
      } else if (showError) {
        setError(result.message || "Revisa la dirección.");
      }
      return Boolean(result.valid);
    } catch (validationError) {
      if (showError) setError(validationError instanceof Error ? validationError.message : "No pudimos validar la dirección.");
      return false;
    } finally {
      setValidating(false);
    }
  }

  function toggleDate(date: string) {
    setSelectedDates((current) => {
      if (current.includes(date)) return current.filter((item) => item !== date);
      if (current.length >= 3) return [...current.slice(1), date];
      return [...current, date];
    });
  }

  async function continueFirstStep() {
    setError("");
    if (!form.address_line_1 || !form.city || !form.region || !form.postal_code) {
      setError("Escribe la dirección, ciudad, estado o provincia y código postal.");
      return;
    }
    const addressOk = addressResult?.valid || (await validateAddress(true));
    if (!addressOk) return;
    if (selectedDates.length === 0) {
      setError("Selecciona al menos un día que te convenga.");
      return;
    }
    setStep(2);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!form.customer_name || form.phone.replace(/\D/g, "").length < 7) {
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
          country_code: "US",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos registrar la solicitud.");
      setSuccessCode(result.request_code);
      setStep(3);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Ocurrió un error inesperado.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white text-slate-950 shadow-[0_35px_90px_rgba(0,0,0,.35)]">
      <div className="grid lg:grid-cols-[1.08fr_.92fr]">
        <div className="p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.17em] text-red-600">Recogida a domicilio</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-[#061b3a] sm:text-3xl">Programa tu recogida</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Truck size={24} /></div>
          </div>

          {step === 1 && (
            <div className="mt-6 space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-black text-slate-700">¿Dónde recogemos?</label>
                  {validating && <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600"><Loader2 className="animate-spin" size={14} /> Verificando</span>}
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="relative sm:col-span-2">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={19} />
                    <input value={form.address_line_1} onChange={(e) => update("address_line_1", e.target.value)} placeholder="Número y calle" autoComplete="street-address" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 font-bold outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                  </label>
                  <input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Ciudad" autoComplete="address-level2" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-bold outline-none focus:border-blue-400 focus:bg-white" />
                  <input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Estado / provincia" autoComplete="address-level1" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-bold outline-none focus:border-blue-400 focus:bg-white" />
                  <input value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} placeholder="ZIP / código postal" autoComplete="postal-code" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-bold outline-none focus:border-blue-400 focus:bg-white sm:col-span-2" />
                </div>

                {addressResult && (
                  <div className={`mt-3 rounded-2xl border p-4 ${addressResult.valid ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="flex items-start gap-3">
                      {addressResult.valid ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} /> : <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />}
                      <div>
                        <p className={`text-sm font-black ${addressResult.valid ? "text-emerald-800" : "text-amber-800"}`}>{addressResult.message}</p>
                        {addressResult.formattedAddress && <p className="mt-1 text-xs font-bold text-slate-600">{addressResult.formattedAddress}</p>}
                        {addressResult.suggestedZoneName && <p className="mt-1 text-xs font-black text-blue-700">Zona sugerida: {addressResult.suggestedZoneName}</p>}
                      </div>
                    </div>
                  </div>
                )}

                <button type="button" onClick={() => validateAddress(true)} disabled={validating} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#061b3a] disabled:opacity-50"><Search size={15} /> Verificar dirección</button>
              </div>

              <div>
                <div className="flex items-end justify-between gap-3">
                  <label className="text-sm font-black text-slate-700">¿Qué días te convienen?</label>
                  <span className="text-[11px] font-bold text-slate-400">Puedes elegir hasta 3</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {days.map((item) => {
                    const selected = selectedDates.includes(item.iso);
                    return (
                      <button key={item.iso} type="button" onClick={() => toggleDate(item.iso)} className={`rounded-2xl border px-2 py-3 text-center transition ${selected ? "border-red-600 bg-red-600 text-white shadow-lg shadow-red-200" : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"}`}>
                        <span className="block text-[11px] font-black uppercase">{item.day}</span>
                        <span className="mt-1 block text-sm font-black">{item.date}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
              <button type="button" onClick={continueFirstStep} disabled={validating} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 px-5 py-4 font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60">Continuar con mi solicitud <ArrowRight size={19} /></button>
              <p className="text-center text-xs font-semibold leading-5 text-slate-500">La fecha será confirmada cuando la agencia organice la ruta de tu zona.</p>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-1 text-sm font-black text-slate-500 hover:text-slate-900"><ChevronLeft size={18} /> Cambiar dirección o fechas</button>
              <div className="rounded-2xl bg-blue-50 p-4 text-sm font-bold text-blue-950">
                <p className="flex items-center gap-2"><MapPin size={17} className="text-red-600" /> {addressResult?.formattedAddress || `${form.address_line_1}, ${form.city}, ${form.region} ${form.postal_code}`}</p>
                <p className="mt-2 flex items-center gap-2"><CalendarDays size={17} className="text-blue-700" /> {selectedDates.length} fecha(s) preferida(s)</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} placeholder="Nombre y apellidos" className="rounded-2xl border border-slate-200 px-4 py-3.5 font-bold outline-none focus:border-blue-400" />
                <input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Teléfono / WhatsApp" inputMode="tel" className="rounded-2xl border border-slate-200 px-4 py-3.5 font-bold outline-none focus:border-blue-400" />
                <select value={form.package_type} onChange={(e) => update("package_type", e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-bold outline-none focus:border-blue-400"><option>Cajas y misceláneas</option><option>Electrodomésticos</option><option>Equipos electrónicos</option><option>Bicicleta</option><option>Otro</option></select>
                <input value={form.package_count} onChange={(e) => update("package_count", e.target.value)} type="number" min="1" max="99" placeholder="Cantidad de paquetes" className="rounded-2xl border border-slate-200 px-4 py-3.5 font-bold outline-none focus:border-blue-400" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => update("needs_box", !form.needs_box)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-black ${form.needs_box ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200"}`}><Box size={21} /> Necesito caja</button>
                <button type="button" onClick={() => update("needs_packing_help", !form.needs_packing_help)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left font-black ${form.needs_packing_help ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200"}`}><Package size={21} /> Ayuda para empacar</button>
              </div>
              <textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Notas adicionales (opcional)" rows={3} className="w-full rounded-2xl border border-slate-200 px-4 py-3.5 font-bold outline-none focus:border-blue-400" />
              {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p>}
              <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-4 font-black text-white disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={19} /> : <Truck size={19} />} Enviar solicitud</button>
            </form>
          )}

          {step === 3 && (
            <div className="mt-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={38} /></div>
              <h3 className="mt-5 text-3xl font-black text-[#061b3a]">¡Solicitud recibida!</h3>
              <p className="mt-3 font-semibold leading-7 text-slate-600">La agencia organizará la ruta y te confirmará el día definitivo por WhatsApp.</p>
              <div className="mx-auto mt-5 max-w-xs rounded-2xl bg-slate-950 px-5 py-4 text-white"><p className="text-xs font-black uppercase tracking-widest text-blue-200">Código de solicitud</p><p className="mt-1 text-2xl font-black">{successCode}</p></div>
            </div>
          )}
        </div>

        <div className="relative min-h-[420px] overflow-hidden bg-gradient-to-br from-[#061b3a] via-[#0a3474] to-[#1174c4] p-6 text-white sm:p-8">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[42px] border-white/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.17em] text-blue-200"><Navigation size={16} /> Rutas inteligentes</div>
            <h3 className="mt-3 text-3xl font-black">Recogemos cerca de ti</h3>
            <p className="mt-3 text-sm font-semibold leading-6 text-blue-100/75">Validamos tu ubicación y agrupamos solicitudes por ciudad o zona para crear una ruta flexible.</p>
            <div className="relative mt-8 h-52 rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="absolute left-[14%] top-[25%] h-4 w-4 rounded-full bg-red-400 ring-8 ring-red-400/15" />
              <div className="absolute left-[45%] top-[54%] h-4 w-4 rounded-full bg-yellow-300 ring-8 ring-yellow-300/15" />
              <div className="absolute right-[14%] top-[28%] h-4 w-4 rounded-full bg-emerald-300 ring-8 ring-emerald-300/15" />
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 200" fill="none" aria-hidden="true"><path d="M58 56C115 28 150 140 205 112C265 82 288 34 350 62" stroke="white" strokeOpacity=".72" strokeWidth="3" strokeDasharray="8 8" /></svg>
              <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-wide text-blue-100"><span>Ciudad</span><span>Zona</span><span>Ruta</span></div>
              <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-white text-[#061b3a] shadow-xl"><Truck size={24} /></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><Route size={20} className="text-yellow-300" /><p className="mt-2 text-sm font-black">Cobertura configurable</p><p className="mt-1 text-xs text-blue-100/70">País, región, ciudades, ZIP o radio.</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><Sparkles size={20} className="text-emerald-300" /><p className="mt-2 text-sm font-black">Dirección confiable</p><p className="mt-1 text-xs text-blue-100/70">Evita ciudades y códigos postales incoherentes.</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
