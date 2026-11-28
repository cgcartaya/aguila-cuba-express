"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { Box, ClipboardList, MapPin } from "lucide-react";

const steps = [
  { label: "Cotizar", icon: Box },
  { label: "Panel de agencia", icon: ClipboardList },
  { label: "Rastrear", icon: MapPin },
];
const destinations = ["La Habana", "Matanzas", "Villa Clara", "Santiago de Cuba"];
const rates = { air: { name: "Aéreo exprés", cents: 499 }, sea: { name: "Marítimo", cents: 299 } };
const statuses = ["Registrado", "En tránsito", "En reparto", "Entregado"];
const trackingCode = "PERLA-0001";
const storageKey = "perla-demo-envios-v1";
const eventName = "perla-demo-envios-change";
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type Quote = {
  destination: string;
  mode: keyof typeof rates;
  weight: number;
  freight: number;
  delivery: number;
};
type Shipment = Quote & { sender: string; recipient: string; contents: string; status: number };

let fallback: string | null = null;
function subscribe(listener: () => void) {
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
function snapshot() {
  try { return sessionStorage.getItem(storageKey); } catch { return fallback; }
}
function save(shipment: Shipment | null) {
  fallback = shipment ? JSON.stringify(shipment) : null;
  try {
    if (fallback === null) sessionStorage.removeItem(storageKey);
    else sessionStorage.setItem(storageKey, fallback);
  } catch {
    // The walkthrough still works when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(eventName));
}
function readShipment(value: string | null): Shipment | null {
  if (!value) return null;
  try {
    const shipment = JSON.parse(value) as Shipment | null;
    return shipment && statuses[shipment.status] && rates[shipment.mode] ? shipment : null;
  } catch { return null; }
}
function price(cents: number) { return dollars.format(cents / 100); }

const card = "min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
const summary = "min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-7";
const field = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base text-slate-950";
const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-4 py-2 font-bold text-white hover:bg-emerald-900";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-900 hover:bg-slate-100";

export default function ShippingDemoPage() {
  const shipment = readShipment(useSyncExternalStore(subscribe, snapshot, () => null));
  const [step, setStep] = useState(0);
  const [destination, setDestination] = useState(destinations[0]);
  const [mode, setMode] = useState<keyof typeof rates>("air");
  const [weight, setWeight] = useState("10");
  const [tracking, setTracking] = useState("");
  const [searched, setSearched] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const pounds = Number(weight);
  const validWeight = pounds >= 1 && pounds <= 100 && Math.abs(pounds * 10 - Math.round(pounds * 10)) < 0.00001;
  const quote: Quote = {
    destination, mode, weight: pounds,
    freight: Math.round(pounds * rates[mode].cents),
    delivery: destination === "La Habana" ? 500 : 1000,
  };
  const tracked = shipment && searched === trackingCode ? shipment : null;

  function navigate(next: number) {
    setStep(next);
    setAnnouncement("");
    if (next === 2 && shipment) {
      setTracking(trackingCode);
      setSearched(trackingCode);
    }
  }

  function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validWeight) { navigate(0); return; }
    const data = new FormData(event.currentTarget);
    const sender = String(data.get("sender")).trim();
    const recipient = String(data.get("recipient")).trim();
    const contents = String(data.get("contents")).trim();
    if (!sender || !recipient || !contents) {
      setAnnouncement("Completa el remitente, el destinatario y el contenido.");
      return;
    }
    save({ ...quote, sender, recipient, contents, status: 0 });
    setAnnouncement("Factura DEMO-0001 emitida.");
  }

  function reset() {
    save(null);
    setWeight("10");
    setDestination(destinations[0]);
    setMode("air");
    setTracking("");
    setSearched("");
    setStep(0);
    setAnnouncement("Demo reiniciada.");
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="bg-slate-950 text-white print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <Link href="/" className="font-extrabold"><span aria-hidden="true" className="mr-2 inline-block size-3 rounded-full bg-emerald-300" />Perla Marketplace</Link>
          <span className="text-sm text-emerald-200">Datos y tarifas de ejemplo</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-8">
        <section className="rounded-3xl bg-slate-900 px-5 py-7 text-white sm:px-9 sm:py-10 print:hidden">
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Envíos a Cuba</h1>
          <p className="mt-2 max-w-xl text-slate-200">Cotiza un paquete, emite una factura y sigue el mismo envío hasta la entrega.</p>
        </section>
        <nav aria-label="Pasos de la demostración" className="flex flex-wrap gap-2 print:hidden">
          {steps.map(({ label, icon: Icon }, index) => (
            <button key={label} type="button" aria-current={step === index ? "step" : undefined}
              className={step === index ? primary : secondary} onClick={() => navigate(index)}>
              <Icon className="mr-2 shrink-0" size={17} aria-hidden="true" />{label}
            </button>
          ))}
        </nav>

        {step === 0 && <section className="grid gap-4 md:grid-cols-[1.35fr_1fr]">
          <form className={card} onSubmit={(event) => { event.preventDefault(); navigate(1); }}>
            <h2 className="text-2xl font-bold">Cotizar envío</h2>
            <div className="my-5 grid gap-4 sm:grid-cols-2">
              <label className="font-semibold">Destino
                <select className={field} value={destination} onChange={(event) => setDestination(event.target.value)}>
                  {destinations.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="font-semibold">Modalidad
                <select className={field} value={mode} onChange={(event) => setMode(event.target.value === "sea" ? "sea" : "air")}>
                  <option value="air">Aéreo exprés</option><option value="sea">Marítimo</option>
                </select>
              </label>
              <label className="font-semibold">Peso en libras
                <input className={field} type="number" min="1" max="100" step="0.1" required value={weight} onChange={(event) => setWeight(event.target.value)} />
              </label>
            </div>
            {shipment
              ? <p className="text-sm text-slate-700">Ya tienes una factura de ejemplo. Reinicia la demo para registrar otra cotización.</p>
              : <button className={primary} type="submit">Continuar al panel</button>}
          </form>
          <aside className={summary} aria-live="polite">
            <h2 className="text-xl font-bold">Total estimado</h2>
            <p className="my-2 text-4xl font-black tracking-tight text-emerald-900">{validWeight ? price(quote.freight + quote.delivery) : "—"}</p>
            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-2 border-t border-emerald-200 pt-4">
              <dt>Transporte</dt><dd>{validWeight ? price(quote.freight) : "—"}</dd>
              <dt>Entrega</dt><dd>{price(quote.delivery)}</dd>
            </dl>
          </aside>
        </section>}

        {step === 1 && <section className="grid gap-4 md:grid-cols-[1.35fr_1fr] print:block">
          <div className={card + " print:hidden"}>
            <h2 className="text-2xl font-bold">Panel de agencia</h2>
            {shipment ? <>
              <p className="mt-2 mb-5 text-slate-600">Envío {trackingCode} · {shipment.destination}</p>
              <label className="block font-semibold">Estado del envío
                <select className={field} value={shipment.status} onChange={(event) => {
                  const status = Number(event.target.value);
                  save({ ...shipment, status });
                  setAnnouncement("Estado actualizado: " + statuses[status] + ".");
                }}>
                  {statuses.map((status, index) => <option key={status} value={index}>{status}</option>)}
                </select>
              </label>
              <button type="button" className={primary + " mt-5"} onClick={() => navigate(2)}>Ver rastreo</button>
            </> : <form onSubmit={register}>
              <p className="mt-2 text-slate-600">{validWeight
                ? [quote.destination, rates[quote.mode].name, quote.weight + " lb", price(quote.freight + quote.delivery)].join(" · ")
                : "Introduce un peso válido en el cotizador."}</p>
              <div className="my-5 grid gap-4 sm:grid-cols-2">
                <label className="font-semibold">Remitente<input className={field} name="sender" defaultValue="Elena Pérez" required maxLength={80} /></label>
                <label className="font-semibold">Destinatario<input className={field} name="recipient" defaultValue="Mario Rodríguez" required maxLength={80} /></label>
                <label className="font-semibold sm:col-span-2">Contenido<input className={field} name="contents" defaultValue="Alimentos y artículos de aseo" required maxLength={120} /></label>
              </div>
              <button className={primary} type="submit">Registrar y emitir factura</button>
            </form>}
          </div>
          <aside className={summary + " print:border-0 print:bg-white"}>
            <h2 className="text-xl font-bold">{shipment ? "Factura de ejemplo DEMO-0001" : "Factura de ejemplo"}</h2>
            {shipment ? <>
              <dl className="my-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 [&>dd]:break-words [&>dd]:text-right">
                <dt>Remitente</dt><dd>{shipment.sender}</dd>
                <dt>Destinatario</dt><dd>{shipment.recipient}</dd>
                <dt>Contenido</dt><dd>{shipment.contents}</dd>
                <dt>Destino</dt><dd>{shipment.destination}</dd>
                <dt>Modalidad</dt><dd>{rates[shipment.mode].name} · {shipment.weight} lb</dd>
                <dt>Transporte</dt><dd>{price(shipment.freight)}</dd>
                <dt>Entrega</dt><dd>{price(shipment.delivery)}</dd>
                <dt>Rastreo</dt><dd>{trackingCode}</dd>
              </dl>
              <p className="border-t border-emerald-200 pt-3 text-xl font-extrabold">Total {price(shipment.freight + shipment.delivery)}</p>
              <button type="button" className={secondary + " mt-4 print:hidden"} onClick={() => window.print()}>Imprimir factura</button>
            </> : <p className="mt-2 text-slate-600">Aquí aparecerá la factura cuando registres el envío.</p>}
          </aside>
        </section>}

        {step === 2 && <section className="grid gap-4 md:grid-cols-[1.35fr_1fr]">
          <form className={card} onSubmit={(event) => { event.preventDefault(); setSearched(tracking.trim().toUpperCase()); }}>
            <h2 className="text-2xl font-bold">Rastrea tu envío</h2>
            <label className="mt-4 block font-semibold">Código de rastreo
              <input className={field} value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder={trackingCode} required />
            </label>
            <button type="submit" className={primary + " mt-4"}>Buscar envío</button>
            <p role="status" className="mt-4 text-slate-700">{searched && !tracked ? (shipment ? "Código no encontrado." : "Registra un envío para activar el rastreo.") : ""}</p>
          </form>
          {tracked && <aside className={summary} aria-live="polite">
            <h2 className="text-2xl font-bold text-emerald-900">{statuses[tracked.status]}</h2>
            <p className="mt-1 text-slate-700">{trackingCode} · {tracked.destination}</p>
            <ol className="mt-4 space-y-2">
              {statuses.map((label, index) => (
                <li key={label} aria-current={index === tracked.status ? "step" : undefined} className="flex items-center gap-3">
                  <span aria-hidden="true" className={index <= tracked.status ? "size-3 rounded-full bg-emerald-700" : "size-3 rounded-full border-2 border-slate-400"} />
                  <span className={index === tracked.status ? "font-bold text-emerald-900" : "text-slate-700"}>{label}</span>
                </li>
              ))}
            </ol>
          </aside>}
        </section>}
        <footer className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <p role="status" className="text-sm text-slate-700">{announcement}</p>
          <button className={secondary} type="button" onClick={reset}>Reiniciar demo</button>
        </footer>
      </div>
    </main>
  );
}
