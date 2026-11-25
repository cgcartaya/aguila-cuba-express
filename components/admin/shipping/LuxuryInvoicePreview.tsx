"use client";

import { useRef, useState, type ComponentProps } from "react";
import { supabase } from "@/lib/supabase";
import CustomerRecipientPicker, { type CustomerSelection } from "./CustomerRecipientPicker";
import type { ShippingRecipient } from "@/lib/shipping/customer-types";
import type { ShippingRate, ShippingServiceType, ShippingTrip } from "@/lib/shipping/types";

type Props = Omit<ComponentProps<typeof CustomerRecipientPicker>, "onApply"> & {
  trips: ShippingTrip[];
  initialTripId: string;
  fixedTrip: boolean;
  services: ShippingServiceType[];
  rates: ShippingRate[];
};

const lineTypes = { shipment: "Envío", passport: "Pasaporte", remittance: "Remesa registrada en otro sistema", other: "Otro servicio" } as const;
type LineType = keyof typeof lineTypes;

type Line = {
  id: string;
  kind: LineType;
  recipientId?: string;
  serviceId?: string;
  notes?: string;
  description: string;
  destination?: string;
  units: number;
  unit: string;
  unitPrice: number;
};

type Folio = {
  id: string;
  folio: number;
  customer_name: string;
  created_at: string;
  total_cents: number;
  lines: (Omit<Line, "id"> & { cents: number })[];
};

const historyPageSize = 15;
const dateFormat = new Intl.DateTimeFormat("es-US", { dateStyle: "medium", timeZone: "America/New_York" });
const folioLabel = (number: number) => String(number).padStart(6, "0");

const currency = new Intl.NumberFormat("es-US", { style: "currency", currency: "USD" });
const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5";
const card = "space-y-4 rounded-2xl border border-slate-200 bg-white p-5";
const button = "rounded-xl bg-[#061b3a] px-4 py-2.5 font-bold text-white disabled:opacity-40";

function lineCents(line: Line) {
  return Math.round(line.units * Math.round(line.unitPrice * 100));
}

export default function LuxuryInvoicePreview({
  trips, initialTripId, fixedTrip, services, rates, ...picker
}: Props) {
  const [tripId, setTripId] = useState(initialTripId);
  const [contact, setContact] = useState<CustomerSelection | null>(null);
  const [customer, setCustomer] = useState<{ id: string; name: string } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [recipients, setRecipients] = useState<ShippingRecipient[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [lineType, setLineType] = useState<LineType | "">("");
  const [serviceId, setServiceId] = useState("");
  const [units, setUnits] = useState("1");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<Folio | null>(null);
  const [history, setHistory] = useState<Folio[] | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<string | null>(null);
  const savingRef = useRef(false);

  async function saveFolio() {
    if (!customer || !lines.length || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError("");
    request.current ??= crypto.randomUUID();
    try {
      const { data, error: cause } = await supabase.rpc("save_luxury_service_folio", {
        p_id: request.current, p_store: picker.storeId, p_customer: customer.id,
        p_trip: lines.some(line => line.kind === "shipment") ? tripId || null : null,
        p_lines: lines, p_total_cents: total,
      }).single<Folio>();
      if (cause || !data) throw new Error(cause?.message || "No se pudo guardar la factura.");
      request.current = null;
      setSaved(data);
      setHistory(null);
      setLines([]);
      setCustomer(null);
      setLineType("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la factura.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function loadHistory(nextPage: number) {
    setLoadingHistory(true);
    setError("");
    try {
      const start = nextPage * historyPageSize;
      const { data, error: cause } = await supabase.from("luxury_service_folios").select("id,folio,customer_name,created_at,total_cents,lines")
        .eq("store_id", picker.storeId).order("folio", { ascending: false })
        .range(start, start + historyPageSize).returns<Folio[]>();
      if (cause) throw new Error(cause.message);
      setHistory((data || []).slice(0, historyPageSize));
      setHasMore((data || []).length > historyPageSize);
      setPage(nextPage);
      setSaved(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial.");
    } finally {
      setLoadingHistory(false);
    }
  }

  const availableServices = services.filter(service => service.is_active && service.code.startsWith("luxury-"));
  const service = availableServices.find(item => item.id === serviceId);
  const fixed = service?.billing_mode === "fixed";
  const recipient = recipients.find(item => item.id === recipientId && item.is_active);
  const rate = rates.filter(item => item.is_active && item.service_type_id === serviceId
    && item.scope_type === "country" && item.country_id === recipient?.country_id)
    .sort((first, second) => first.priority - second.priority || first.id.localeCompare(second.id))[0];
  const price = Number(fixed ? rate?.fixed_fee : rate?.rate_per_lb);
  const total = lines.reduce((sum, line) => sum + lineCents(line), 0);
  const sameCustomer = !customer || contact?.customer_id === customer.id;
  const quantity = Number(units);
  const validQuantity = Number.isFinite(quantity) && quantity > 0 && (!fixed || Number.isInteger(quantity));

  function addLine(line: Omit<Line, "id">) {
    if (!contact?.customer_id || !sameCustomer) return;
    setCustomer({ id: contact.customer_id, name: contact.sender_name });
    setLines(current => [...current, { ...line, id: crypto.randomUUID() }]);
    setRecipientId("");
    setUnits("1");
    setAmount("");
    setNotes("");
    setLineType("");
  }

  function applyContact(selection: CustomerSelection, customerRecipients: ShippingRecipient[]) {
    setContact(selection);
    setRecipients(customerRecipients);
    setRecipientId(selection.recipient_id || "");
  }

  return <div className="space-y-5">
    <div className="flex flex-wrap gap-2 print:hidden">
      {(saved || history) && <button type="button" className={button} onClick={() => { setSaved(null); setHistory(null); setError(""); }}>
        {lines.length ? "Volver a la factura en curso" : "Registrar factura"}
      </button>}
      <button type="button" className={button} disabled={saving || loadingHistory} onClick={() => void loadHistory(0)}>Historial de folios</button>
      {saved && <button type="button" className={button} onClick={() => window.print()}>Imprimir factura</button>}
    </div>
    {error && (saved || history) && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
    {saved ? <article id="luxury-folio-print" className={card}>
      <style>{`@media print {
        body:has(#luxury-folio-print) :not(:has(#luxury-folio-print)):not(#luxury-folio-print):not(#luxury-folio-print *) { display: none !important; }
        body:has(#luxury-folio-print) *:has(#luxury-folio-print) { display: block !important; position: static !important; overflow: visible !important; height: auto !important; padding: 0 !important; margin: 0 !important; }
        #luxury-folio-print { border: 0; }
        #luxury-folio-print li { break-inside: avoid; }
      }`}</style>
      <h2 className="text-xl font-black">Luxury Travel Point</h2>
      <p className="font-bold">Factura · Folio {folioLabel(saved.folio)}</p>
      <p>{dateFormat.format(new Date(saved.created_at))} · {saved.customer_name}</p>
      <ul className="divide-y divide-slate-200">
        {saved.lines.map((line, index) => <li key={index} className="flex flex-wrap justify-between gap-3 py-3">
          <div>
            <p className="font-bold">{line.description}</p>
            {line.destination && <p>{line.destination}</p>}
            <p>{line.units} {line.unit} × {currency.format(line.unitPrice)}</p>
          </div>
          <strong>{currency.format(line.cents / 100)}</strong>
        </li>)}
      </ul>
      <p className="border-t pt-4 text-right text-xl font-black">Total {currency.format(saved.total_cents / 100)}</p>
    </article> : history ? <section className={card}>
      <h2 className="text-xl font-black">Historial de folios</h2>
      {!history.length && <p>Todavía no hay facturas guardadas.</p>}
      <ul className="divide-y divide-slate-200">
        {history.map(invoice => <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div><p className="font-bold">Folio {folioLabel(invoice.folio)} · {invoice.customer_name}</p>
          <p className="text-sm text-slate-600">{dateFormat.format(new Date(invoice.created_at))} · {currency.format(invoice.total_cents / 100)}</p></div>
          <button type="button" className={button} onClick={() => setSaved(invoice)}>Abrir factura</button>
        </li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        {page > 0 && <button type="button" className={button} disabled={loadingHistory} onClick={() => void loadHistory(page - 1)}>Anterior</button>}
        {hasMore && <button type="button" className={button} disabled={loadingHistory} onClick={() => void loadHistory(page + 1)}>Siguiente</button>}
      </div>
    </section> : <fieldset disabled={saving} className="space-y-5">
    <p className="text-sm text-slate-600">Registra los servicios que cobraste. El sistema asigna un folio al guardar la factura.</p>
    <div id="luxury-invoice-customer" className="scroll-mt-24"><CustomerRecipientPicker {...picker} inlineRecipientSelection onApply={applyContact} /></div>
    {customer && !sameCustomer && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
      Vuelve a seleccionar a {customer.name} para añadir renglones a esta factura.
    </p>}
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">Agregar a la factura</h2>
        {lineType && <button type="button" className="rounded-lg border px-3 py-2 text-sm font-bold" onClick={() => setLineType("")}>Cerrar</button>}
      </div>
      {!contact?.customer_id && <p className="text-sm text-slate-600">Selecciona un cliente para agregar envíos o servicios.</p>}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(lineTypes) as [LineType, string][]).map(([type, label]) => (
          <button key={type} type="button" disabled={!contact?.customer_id || !sameCustomer}
            aria-pressed={lineType === type} onClick={() => setLineType(type)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40 ${lineType === type ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-300 text-slate-700"}`}>
            + {label}
          </button>
        ))}
      </div>
      {lineType === "shipment" && <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">Viaje de referencia (opcional)
          <select className={field} value={tripId} disabled={fixedTrip} onChange={event => setTripId(event.target.value)}>
            <option value="">Sin viaje asociado</option>
            {trips.map(trip => <option key={trip.id} value={trip.id}>{trip.trip_number} · {trip.name}</option>)}
          </select>
        </label>
        <div>
          <label className="block text-sm font-bold">Destinatario de este envío
            <select className={field} value={recipientId} onChange={event => setRecipientId(event.target.value)}>
              <option value="">Selecciona un destinatario</option>
              {recipients.filter(item => item.is_active).map(item => <option key={item.id} value={item.id}>
                {[item.name, item.address].filter(Boolean).join(" · ")}
              </option>)}
            </select>
          </label>
          <a href="#luxury-invoice-customer" className="mt-2 inline-block text-sm font-bold text-blue-800 underline">Registrar un destinatario nuevo</a>
        </div>
        <label className="block text-sm font-bold">Modalidad
          <select className={field} value={serviceId} onChange={event => { setServiceId(event.target.value); setUnits("1"); }}>
            <option value="">Selecciona una modalidad</option>
            {availableServices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        {service && <label className="block text-sm font-bold">{fixed ? "Cantidad de cajas" : "Peso en libras"}
          <input className={field} type="number" min={fixed ? "1" : "0.01"} step={fixed ? "1" : "0.01"}
            value={units} onChange={event => setUnits(event.target.value)} />
        </label>}
        {service && <p className="text-sm text-slate-600">
          {Number.isFinite(price) ? currency.format(price) + (fixed ? " por caja" : " por libra")
            : "Selecciona un destinatario con país configurado y tarifa disponible."}
        </p>}
        <button type="button" className={button}
          disabled={!recipient || !sameCustomer
            || !service || !Number.isFinite(price) || price <= 0 || !validQuantity}
          onClick={() => {
            if (!service || !recipient) return;
            addLine({ kind: "shipment", recipientId: recipient.id, serviceId: service.id, description: service.name, destination: [recipient.name, recipient.address].filter(Boolean).join(" · "),
              units: quantity, unit: fixed ? "caja" : "lb", unitPrice: price });
          }}>Agregar envío</button>
      </div>}
      {lineType && lineType !== "shipment" && <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">Importe a facturar (USD)
          <input className={field} type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} />
        </label>
        <label className="block text-sm font-bold">{lineType === "other" ? "Nombre del servicio" : "Detalle o referencia externa (opcional)"}
          <input className={field} value={notes} onChange={event => setNotes(event.target.value)} maxLength={200} />
        </label>
        <button type="button" className={button} disabled={!contact?.customer_id || !sameCustomer || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || (lineType === "other" && !notes.trim())}
          onClick={() => {
            addLine({ kind: lineType, notes: notes.trim(), description: [lineType === "other" ? "" : lineTypes[lineType], notes.trim()].filter(Boolean).join(" · "), units: 1, unit: "servicio", unitPrice: Number(amount) });
            setAmount("");
            setNotes("");
          }}>Agregar servicio</button>
      </div>}
    </section>
    <section className={card} aria-label="Vista previa de la factura">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950">Factura preliminar</h2>
        <p className="text-sm font-bold text-slate-600">Folio pendiente</p>
      </div>
      <p className="text-sm text-slate-600">{customer?.name || contact?.sender_name || "Selecciona un cliente"}</p>
      {lines.length === 0 && <p className="text-sm text-slate-600">Agrega un envío o un servicio para ver el detalle.</p>}
      <ul className="divide-y divide-slate-200">
        {lines.map(line => <li key={line.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 break-words">
            <p className="font-bold">{line.description}</p>
            {line.destination && <p className="text-sm text-slate-600">{line.destination}</p>}
            <p className="text-sm text-slate-600">{line.units} {line.unit} × {currency.format(line.unitPrice)}</p>
          </div>
          <div className="flex items-center gap-3">
            <strong>{currency.format(lineCents(line) / 100)}</strong>
            <button type="button" className="rounded-lg border px-3 py-2 text-sm font-bold text-slate-700"
              aria-label={"Quitar " + line.description} onClick={() => {
                setLines(current => current.filter(item => item.id !== line.id));
                if (lines.length === 1) setCustomer(null);
              }}>Quitar</button>
          </div>
        </li>)}
      </ul>
      <p aria-live="polite" className="border-t pt-4 text-right text-xl font-black">Total {currency.format(total / 100)}</p>
      {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
      <button type="button" className={button} disabled={saving || !lines.length || Boolean(lineType)} onClick={() => void saveFolio()}>
        {saving ? "Guardando…" : "Guardar factura"}
      </button>
      {lineType && lines.length > 0 && <p className="text-sm text-slate-600">Agrega el concepto abierto o ciérralo antes de guardar.</p>}
    </section>
    </fieldset>}
  </div>;
}
