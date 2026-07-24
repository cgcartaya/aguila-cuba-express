"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Plane,
  Ship,
  Truck,
  UserRound,
  Weight,
} from "lucide-react";

type Option = { id: string; name: string };
type Service = Option & { code?: string; billing_mode?: string };
type Readiness = {
  ready: boolean;
  hasServices: boolean;
  hasCountries: boolean;
  hasRules: boolean;
  serviceCount: number;
  countryCount: number;
  ruleCount: number;
};
type PortalConfig = {
  store: { id: string; name: string; logo_url?: string | null; primary_color?: string | null; secondary_color?: string | null };
  settings: {
    quote_title: string;
    quote_subtitle: string;
    disclaimer: string;
    default_origin_label: string;
    pickup_mode: string;
    pickup_fee: number;
    insurance_mode: string;
    insurance_value: number;
    currency: string;
    whatsapp_phone?: string | null;
  };
  services: Service[];
  countries: Option[];
  provinces: Array<Option & { country_id: string }>;
  municipalities: Array<Option & { province_id: string }>;
  locations: Array<Option & { municipality_id: string }>;
  categories: string[];
  transportModes: string[];
  readiness: Readiness;
};

type QuoteResult = {
  public_code: string;
  total_amount: number;
  base_amount: number;
  pickup_amount: number;
  insurance_amount: number;
  airport_fee_amount?: number;
  shipping_amount?: number;
  currency: string;
  estimated_days_min?: number | null;
  estimated_days_max?: number | null;
  whatsapp_url?: string;
  billable_weight_lb?: number;
  applied_rate?: number;
  rule_name?: string;
  destination_label?: string;
};

const modeLabels: Record<string, string> = { air: "Aéreo", sea: "Marítimo", express: "Express", ground: "Terrestre", other: "Otro" };
const categoryDescriptions: Record<string, string> = {
  miscelaneas: "Aseo, medicinas, comida, ropa y zapatos",
  duraderos: "Electrónicos y artículos del hogar",
  energia: "Estaciones de energía y equipos similares",
};

function normalizeCategory(service?: Service) {
  const value = `${service?.code || ""} ${service?.name || ""}`.toLowerCase();
  if (/energ|power|station|bater/.test(value)) return "energia";
  if (/durader|electr|hogar|appliance/.test(value)) return "duraderos";
  return "miscelaneas";
}

function categoryLabel(service?: Service) {
  const category = normalizeCategory(service);
  if (category === "energia") return "Estación de energía";
  if (category === "duraderos") return "Duraderos";
  return "Misceláneas";
}
const modeIcons = { air: Plane, sea: Ship, express: Plane, ground: Truck, other: Package };

const initialForm = {
  service_type_id: "",
  country_id: "",
  province_id: "",
  municipality_id: "",
  location_id: "",
  transport_mode: "",
  item_category: "",
  weight_lb: "10",
  quantity: "1",
  pickup_requested: false,
  pickup_address: "",
  insurance_requested: false,
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  notes: "",
};

export default function PublicQuoteCalculator({ embedded = false }: { embedded?: boolean }) {
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QuoteResult | null>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/public/quote/config", { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "No se pudo cargar el cotizador.");
        setConfig(json);
        setForm((current) => ({
          ...current,
          service_type_id: json.services?.[0]?.id || "",
          country_id: json.countries?.[0]?.id || "",
          transport_mode: json.transportModes?.[0] || "",
          item_category: normalizeCategory(json.services?.[0]),
        }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No se pudo cargar el cotizador.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const provinces = useMemo(() => config?.provinces.filter((item) => item.country_id === form.country_id) || [], [config, form.country_id]);
  const municipalities = useMemo(() => config?.municipalities.filter((item) => item.province_id === form.province_id) || [], [config, form.province_id]);
  const locations = useMemo(() => config?.locations.filter((item) => item.municipality_id === form.municipality_id) || [], [config, form.municipality_id]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setResult(null);
    setError("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  function nextStep() {
    if (step === 1 && (!form.service_type_id || !form.transport_mode)) {
      setError("Selecciona la categoría y la modalidad de envío.");
      return;
    }
    if (step === 2 && (!form.country_id || Number(form.weight_lb) <= 0)) {
      setError("Selecciona el país e indica un peso válido.");
      return;
    }
    setError("");
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      setError("Completa tu nombre y teléfono.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/public/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, weight_lb: Number(form.weight_lb), quantity: Number(form.quantity) }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "No se pudo calcular.");
      setResult(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo calcular.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin" size={34} /></div>;
  }

  if (!config) {
    return <Unavailable title="Cotizador no disponible" text={error || "No se pudo cargar la configuración."} />;
  }

  if (!config.readiness.ready) {
    const missing = [
      !config.readiness.hasServices && "servicios activos",
      !config.readiness.hasCountries && "países o destinos",
      !config.readiness.hasRules && "tarifas publicadas",
    ].filter(Boolean).join(", ");
    return <Unavailable title="La agencia está terminando de configurar el cotizador" text={`Todavía faltan: ${missing}. Puedes contactar a la agencia para recibir una cotización manual.`} />;
  }

  const primary = config.store.primary_color || "#071d43";
  const selectedServiceObject = config.services.find((item) => item.id === form.service_type_id);
  const selectedService = categoryLabel(selectedServiceObject);
  const selectedCategory = normalizeCategory(selectedServiceObject);
  const pickupFee = Number(config.settings.pickup_fee || 20);
  const airportFeeApplies = selectedCategory === "energia" && ["air", "express"].includes(form.transport_mode);
  const selectedCountry = config.countries.find((item) => item.id === form.country_id)?.name || "Destino";

  return (
    <div className={`grid gap-6 lg:grid-cols-[1.15fr_.85fr] ${embedded ? "mx-auto max-w-7xl" : ""}`}>
      <form onSubmit={submit} className="overflow-hidden rounded-[2rem] bg-white shadow-xl">
        <div className="border-b border-slate-100 p-5 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-wider"><Calculator size={15} /> Cotizador inteligente</div>
          <h2 className="mt-4 text-3xl font-black text-slate-950">{config.settings.quote_title}</h2>
          <p className="mt-2 text-slate-500">{config.settings.quote_subtitle}</p>
          <div className="mt-7 grid grid-cols-3 gap-2">
            {["Qué envías", "Destino y peso", "Tus datos"].map((label, index) => {
              const number = index + 1;
              return <div key={label} className={`rounded-2xl border p-3 text-center ${step === number ? "border-blue-500 bg-blue-50" : step > number ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}><span className="block text-xs font-black uppercase tracking-wide text-slate-400">Paso {number}</span><b className="mt-1 block text-sm text-slate-800">{label}</b></div>;
            })}
          </div>
        </div>

        <div className="p-5 sm:p-8">
          {step === 1 && <div className="space-y-7">
            <StepTitle icon={<Package />} title="¿Qué deseas enviar?" text="Primero selecciona la categoría del contenido y después la modalidad de envío." />
            <div><p className="text-sm font-black text-slate-700">Categoría del envío</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{config.services.map((item) => { const active = form.service_type_id === item.id; const category = normalizeCategory(item); const label = categoryLabel(item); return <button type="button" key={item.id} onClick={() => { setField("service_type_id", item.id); setField("item_category", category); }} className={`rounded-2xl border p-4 text-left transition ${active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}><Package className={active ? "text-blue-700" : "text-slate-400"}/><b className="mt-3 block text-slate-900">{label}</b><small className="mt-1 block leading-5 text-slate-500">{categoryDescriptions[category]}</small>{category === "energia" && <span className="mt-3 block rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">Express y Aéreo: fee aeroportuario de $50</span>}</button>; })}</div></div>
            <div><p className="text-sm font-black text-slate-700">Modalidad de envío</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{config.transportModes.map((mode) => { const Icon = modeIcons[mode as keyof typeof modeIcons] || Package; const active = form.transport_mode === mode; return <button type="button" key={mode} onClick={() => setField("transport_mode", mode)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${active ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:border-slate-300"}`}><Icon className={active ? "text-blue-700" : "text-slate-400"} /><span><b className="block text-slate-900">{modeLabels[mode] || mode}</b><small className="text-slate-500">Seleccionar modalidad</small></span></button>; })}</div>{airportFeeApplies && <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">Esta modalidad incluye un fee aeroportuario adicional de $50 para estaciones de energía.</p>}</div>
          </div>}

          {step === 2 && <div className="space-y-7">
            <StepTitle icon={<MapPin />} title="¿A dónde va el envío?" text="El precio puede cambiar según provincia, municipio o lugar." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="País"><select value={form.country_id} onChange={(event) => { setField("country_id", event.target.value); setField("province_id", ""); setField("municipality_id", ""); setField("location_id", ""); }} required><option value="">Selecciona un país</option>{config.countries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Provincia"><select value={form.province_id} onChange={(event) => { setField("province_id", event.target.value); setField("municipality_id", ""); setField("location_id", ""); }}><option value="">Cualquier provincia</option>{provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Municipio"><select value={form.municipality_id} onChange={(event) => { setField("municipality_id", event.target.value); setField("location_id", ""); }}><option value="">Cualquier municipio</option>{municipalities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Lugar"><select value={form.location_id} onChange={(event) => setField("location_id", event.target.value)}><option value="">Cualquier lugar</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
              <Field label="Peso estimado (lb)"><input type="number" min="0.1" step="0.1" value={form.weight_lb} onChange={(event) => setField("weight_lb", event.target.value)} required /></Field>
              <Field label="Cantidad de bultos"><input type="number" min="1" step="1" value={form.quantity} onChange={(event) => setField("quantity", event.target.value)} required /></Field>
            </div>
            {config.settings.pickup_mode !== "disabled" && <label className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${form.pickup_requested ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}><input type="checkbox" checked={form.pickup_requested} onChange={(event) => setField("pickup_requested", event.target.checked)} className="mt-1" /><span><b className="text-slate-900">Solicitar recogida a domicilio</b><small className="block text-slate-500">{config.settings.pickup_mode === "free" ? "Recogida gratuita" : `Cargo fijo: $${pickupFee.toFixed(2)} USD`}</small></span></label>}
            {form.pickup_requested && <Field label="Dirección de recogida"><input value={form.pickup_address} onChange={(event) => setField("pickup_address", event.target.value)} required /></Field>}
          </div>}

          {step === 3 && <div className="space-y-7">
            <StepTitle icon={<UserRound />} title="¿Cómo te contactamos?" text="Guardaremos la cotización y la agencia podrá ayudarte a continuar." />
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre"><input value={form.customer_name} onChange={(event) => setField("customer_name", event.target.value)} required /></Field><Field label="Teléfono"><input value={form.customer_phone} onChange={(event) => setField("customer_phone", event.target.value)} required inputMode="tel" /></Field><Field label="Correo (opcional)"><input type="email" value={form.customer_email} onChange={(event) => setField("customer_email", event.target.value)} /></Field><Field label="Notas (opcional)"><input value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Ej.: electrodoméstico, medicina, dimensiones..." /></Field></div>
            <div className="rounded-2xl bg-slate-50 p-5"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Resumen antes de calcular</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><Summary label="Categoría" value={selectedService} /><Summary label="Método" value={modeLabels[form.transport_mode] || form.transport_mode} /><Summary label="Destino" value={selectedCountry} /><Summary label="Peso" value={`${form.weight_lb} lb`} /></div></div>
          </div>}

          {error && <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 font-bold text-red-700">{error}</p>}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            {step > 1 ? <button type="button" onClick={() => setStep((current) => current - 1)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3.5 font-black text-slate-700"><ArrowLeft size={18} /> Atrás</button> : <span />}
            {step < 3 ? <button type="button" onClick={nextStep} className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-black text-white" style={{ backgroundColor: primary }}>Continuar <ArrowRight size={18} /></button> : <button disabled={sending} className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-black text-white disabled:opacity-60" style={{ backgroundColor: primary }}>{sending ? <Loader2 className="animate-spin" /> : <Calculator />} Calcular y guardar</button>}
          </div>
        </div>
      </form>

      <aside className="rounded-[2rem] p-6 text-white shadow-2xl lg:sticky lg:top-24 lg:h-fit" style={{ backgroundColor: primary }}>
        {!result ? <>
          <Package size={42} />
          <h2 className="mt-5 text-2xl font-black">Un estimado claro y profesional</h2>
          <p className="mt-2 text-white/70">Completa los pasos y recibirás un resumen listo para compartir.</p>
          <div className="mt-6 grid gap-3"><Info icon={<Plane />} text="Tarifas aéreas configurables" /><Info icon={<Ship />} text="Tarifas marítimas configurables" /><Info icon={<Weight />} text="Peso mínimo y cargos incluidos" /><Info icon={<Truck />} text="Recogida opcional" /></div>
        </> : <>
          <CheckCircle2 size={46} className="text-emerald-300" />
          <p className="mt-4 text-sm font-black uppercase tracking-wider text-white/60">{result.public_code}</p>
          <h2 className="mt-2 text-3xl font-black">Cotización lista</h2>
          <div className="mt-6 space-y-3 rounded-2xl bg-white/10 p-5"><ResultRow label="Envío" value={result.shipping_amount ?? result.base_amount} />{Boolean(result.airport_fee_amount) && <ResultRow label="Fee aeroportuario" value={result.airport_fee_amount || 0} />}<ResultRow label="Recogida" value={result.pickup_amount} /><ResultRow label="Seguro" value={result.insurance_amount} />{result.billable_weight_lb && <div className="flex justify-between text-sm text-white/70"><span>Peso facturable</span><b>{result.billable_weight_lb} lb</b></div>}<div className="border-t border-white/15 pt-4"><div className="flex items-end justify-between gap-3"><b>Total estimado</b><strong className="text-3xl">{new Intl.NumberFormat("en-US", { style: "currency", currency: result.currency }).format(result.total_amount)}</strong></div></div></div>
          {(result.estimated_days_min || result.estimated_days_max) && <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm font-semibold">Entrega estimada: {result.estimated_days_min ?? "?"}–{result.estimated_days_max ?? "?"} días</p>}
          {result.whatsapp_url && <a href={result.whatsapp_url} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 p-4 font-black"><MessageCircle /> Continuar por WhatsApp</a>}
          <button type="button" onClick={() => { setResult(null); setStep(1); }} className="mt-3 w-full rounded-2xl border border-white/20 p-3 font-black text-white">Crear otra cotización</button>
          <p className="mt-5 text-sm text-white/60">{config.settings.disclaimer}</p>
        </>}
      </aside>
    </div>
  );
}

function Unavailable({ title, text }: { title: string; text: string }) { return <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center"><Calculator className="mx-auto text-amber-600" size={42} /><h2 className="mt-4 text-2xl font-black text-slate-900">{title}</h2><p className="mx-auto mt-2 max-w-xl font-medium text-slate-600">{text}</p></div>; }
function StepTitle({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex items-start gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">{icon}</div><div><h3 className="text-2xl font-black text-slate-950">{title}</h3><p className="mt-1 text-slate-500">{text}</p></div></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-black text-slate-700">{label}<div className="mt-2 [&_input]:w-full [&_input]:rounded-2xl [&_input]:border [&_input]:border-slate-200 [&_input]:bg-white [&_input]:p-3.5 [&_input]:font-semibold [&_input]:outline-none focus-within:[&_input]:border-blue-500 [&_select]:w-full [&_select]:rounded-2xl [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:p-3.5 [&_select]:font-semibold [&_select]:outline-none focus-within:[&_select]:border-blue-500">{children}</div></label>; }
function Info({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">{icon}<span className="font-semibold">{text}</span></div>; }
function Summary({ label, value }: { label: string; value: string }) { return <div><small className="font-bold text-slate-400">{label}</small><b className="block text-slate-800">{value}</b></div>; }
function ResultRow({ label, value }: { label: string; value: number }) { return <div className="flex justify-between"><span>{label}</span><b>${Number(value || 0).toFixed(2)}</b></div>; }
