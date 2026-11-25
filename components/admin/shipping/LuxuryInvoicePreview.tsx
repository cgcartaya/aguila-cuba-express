"use client";

import Image from "next/image";
import { Eye, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { supabase } from "@/lib/supabase";
import PhysicalProductsEditor from "./PhysicalProductsEditor";
import { normalizeCustomsCharges, type CustomsCharge } from "@/lib/shipping/customs-charges";
import type { PhysicalProductLine } from "@/lib/shipping/remittance-delivery";
import CustomerRecipientPicker, { type CustomerSelection } from "./CustomerRecipientPicker";
import type { ShippingRecipient } from "@/lib/shipping/customer-types";
import type { ShippingRate, ShippingServiceType, ShippingTrip } from "@/lib/shipping/types";

type Props = Omit<ComponentProps<typeof CustomerRecipientPicker>, "onApply"> & {
  trips: ShippingTrip[];
  services: ShippingServiceType[];
  rates: ShippingRate[];
};

const lineTypes = { shipment: "Envío", product: "Tienda física", passport: "Pasaporte", remittance: "Remesa registrada en otro sistema", other: "Otro servicio" } as const;
type LineType = keyof typeof lineTypes;

type Line = {
  id: string;
  kind: LineType | "customs";
  productId?: string;
  providerId?: string;
  providerName?: string;
  groupId?: string;
  recipientId?: string;
  serviceId?: string;
  notes?: string;
  description: string;
  destination?: string;
  units: number;
  unit: string;
  unitPrice: number;
};

type PrintContact = { name?: string; phone?: string | null; address?: string | null };

type FolioOption = { id: string; name: string; kind: "provider" | "method"; active: boolean };
type PaymentDraft = { id: string; methodId: string; amount: string; reference: string };
type Folio = {
  payment_control?: boolean;
  paid_cents?: number;
  payments?: { methodName: string; cents: number }[];
  id: string;
  folio: number;
  customer_name: string;
  sender_contact?: PrintContact | null;
  recipient_contacts?: Record<string, PrintContact>;
  created_at: string;
  total_cents: number;
  lines: (Omit<Line, "id"> & { cents: number })[];
};

type HistoryFilters = { search: string; from: string; to: string; providerId?: string; methodId?: string };
const emptyFilters: HistoryFilters = { search: "", from: "", to: "" };
const easternOffset = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", timeZoneName: "longOffset",
});

// Eastern midnight uses the offset in effect before the early-morning DST transition.
function easternMidnight(date: string, nextDay = false) {
  const midnightUtc = new Date(date + "T00:00:00Z");
  if (nextDay) midnightUtc.setUTCDate(midnightUtc.getUTCDate() + 1);
  const day = midnightUtc.toISOString().slice(0, 10);
  midnightUtc.setUTCHours(5);
  const offset = easternOffset.formatToParts(midnightUtc).find(part => part.type === "timeZoneName")?.value.slice(3);
  return day + "T00:00:00" + offset;
}

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
  trips, services, rates, ...picker
}: Props) {
  const [tripId, setTripId] = useState("");
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
  const [products, setProducts] = useState<PhysicalProductLine[]>([]);
  const [customs, setCustoms] = useState<CustomsCharge[]>([]);
  const [lineError, setLineError] = useState("");
  const [saved, setSaved] = useState<Folio | null>(null);
  const [history, setHistory] = useState<Folio[] | null>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const request = useRef<string | null>(null);
  const savingRef = useRef(false);

  const [options, setOptions] = useState<FolioOption[]>([]);
  const [optionsError, setOptionsError] = useState("");
  const [payments, setPayments] = useState<PaymentDraft[]>([]);
  const providers = options.filter(option => option.kind === "provider");
  const methods = options.filter(option => option.kind === "method");
  const paymentCents = payments.map(payment => Math.round(Number(payment.amount) * 100));
  const paid = paymentCents.reduce((sum, cents) => sum + cents, 0);

  useEffect(() => {
    let active = true;
    void (async () => {
      const result = await supabase.from("luxury_folio_options").select("id,name,kind,active")
        .eq("store_id", picker.storeId).order("name").returns<FolioOption[]>();
      if (!active) return;
      setOptions(result.data ?? []);
      setOptionsError(result.error ? "No se pudieron cargar proveedores y formas de pago." : "");
    })();
    return () => { active = false; };
  }, [picker.storeId]);

  function editPayment(id: string, values: Partial<Omit<PaymentDraft, "id">>) {
    setPayments(current => current.map(payment => payment.id === id ? { ...payment, ...values } : payment));
  }

  async function saveFolio() {
    if (!customer || !lines.length || savingRef.current) return;
    if (payments.some((payment, index) => !payment.methodId || !/^\d+(?:\.\d{1,2})?$/.test(payment.amount)
      || !Number.isSafeInteger(paymentCents[index]) || paymentCents[index] <= 0) || paid > total) {
      setError("Completa cada pago con una forma y un importe válido. La suma no puede superar el total.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    request.current ??= crypto.randomUUID();
    try {
      const { data, error: cause } = await supabase.rpc("save_luxury_service_folio_with_payments", {
        p_id: request.current, p_store: picker.storeId, p_customer: customer.id,
        p_trip: lines.some(line => line.kind === "shipment") ? tripId || null : null,
        p_lines: lines, p_total_cents: total,
        p_payments: payments.map((payment, index) => ({ methodId: payment.methodId, cents: paymentCents[index], reference: payment.reference })),
      }).single<Folio>();
      if (cause || !data) throw new Error(cause?.message || "No se pudo guardar la factura.");
      request.current = null;
      setSaved(data);
      setHistory(null);
      setLines([]);
      setPayments([]);
      setCustomer(null);
      setLineType("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la factura.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const loadHistory = useCallback(async (nextPage: number, criteria = emptyFilters) => {
    setLoadingHistory(true);
    setError("");
    try {
      const start = nextPage * historyPageSize;
      let query = supabase.from("luxury_service_folios").select("id,folio,customer_name,created_at,total_cents,lines,sender_contact,recipient_contacts,payments,paid_cents,payment_control")
        .eq("store_id", picker.storeId);
      const search = criteria.search.trim();
      if (search) {
        const folio = Number(search);
        query = /^\d+$/.test(search) && Number.isSafeInteger(folio)
          ? query.eq("folio", folio)
          : query.ilike("customer_name", "%" + search.replace(/[\\%_]/g, "\\$&") + "%");
      }
      if (criteria.providerId) query = query.contains("lines", JSON.stringify([{ providerId: criteria.providerId }]));
      if (criteria.methodId) query = query.contains("payments", JSON.stringify([{ methodId: criteria.methodId }]));
      if (criteria.from) query = query.gte("created_at", easternMidnight(criteria.from));
      if (criteria.to) query = query.lt("created_at", easternMidnight(criteria.to, true));
      const { data, error: cause } = await query.order("folio", { ascending: false })
        .range(start, start + historyPageSize).returns<Folio[]>();
      if (cause) throw new Error(cause.message);
      setHistory((data || []).slice(0, historyPageSize));
      setHasMore((data || []).length > historyPageSize);
      setPage(nextPage);
      setAppliedFilters(criteria);
      setSaved(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el historial.");
    } finally {
      setLoadingHistory(false);
    }
  }, [picker.storeId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(0), 0);
    return () => window.clearTimeout(timer);
  }, [loadHistory]);

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

  function productLines(destination?: string, linkedRecipient?: string): Omit<Line, "id">[] {
    return products.map(item => ({
      kind: "product", productId: item.product_id, recipientId: linkedRecipient, destination,
      description: item.name, units: item.quantity, unit: "unidad", unitPrice: item.unit_price,
    }));
  }

  const validProducts = products.every(item => Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 999);
  function addLines(...entries: Omit<Line, "id">[]) {
    if (!contact?.customer_id || !sameCustomer) return;
    if (lines.length + entries.length > 100) {
      setLineError("Puedes añadir hasta 100 conceptos por factura.");
      return;
    }
    const groupId = entries[0]?.kind === "shipment" ? crypto.randomUUID() : undefined;
    setCustomer({ id: contact.customer_id, name: contact.sender_name });
    setLines(current => [...current, ...entries.map(line => ({ ...line, groupId, id: crypto.randomUUID() }))]);
    setLineError("");
    setProducts([]);
    setCustoms([]);
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
    <header className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      <h1 className="text-3xl font-black text-[#061b3a]">Facturas con folio</h1>
      <div className="flex flex-wrap gap-2">
      {(saved || history) && <button type="button" className={button} onClick={() => { setSaved(null); setHistory(null); setError(""); }}>
        <span className="inline-flex items-center gap-2"><Plus size={18} aria-hidden="true" />{lines.length ? "Volver a la factura en curso" : "Nueva factura"}</span>
      </button>}
      {(!history || saved) && <button type="button" className={button} disabled={saving || loadingHistory} onClick={() => void loadHistory(history ? page : 0, appliedFilters)}>Historial de folios</button>}
      {saved && <button type="button" className={button} onClick={() => window.print()}>Imprimir factura</button>}
      </div>
    </header>
    {error && (saved || history) && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
    {saved ? <>
      {saved.lines.some(line => line.providerName) && <section className={card + " print:hidden"} aria-label="Proveedores registrados">
        <h2 className="font-black">Proveedores registrados</h2>
        <ul className="space-y-1 text-sm">
          {saved.lines.map((line, index) => line.providerName && <li key={index}>{line.description} · <strong>{line.providerName}</strong></li>)}
        </ul>
      </section>}
      <CompactInvoice invoice={saved} />
    </> : history ? <section className="space-y-5" aria-label="Historial de folios">
      <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4"
        onSubmit={event => { event.preventDefault(); void loadHistory(0, filters); }}>
        <label className="min-w-0 flex-[1_1_16rem] text-sm font-bold text-slate-700">
          Folio o cliente
          <span className="relative mt-1 block">
            <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-amber-800" />
            <input type="search" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3" value={filters.search} maxLength={100}
              onChange={event => setFilters(current => ({ ...current, search: event.target.value }))}
              placeholder="Buscar por folio o cliente" />
          </span>
        </label>
        <label className="text-sm font-bold text-slate-700">Desde
          <input type="date" className={field} value={filters.from} max={filters.to || undefined}
            onChange={event => setFilters(current => ({ ...current, from: event.target.value }))} />
        </label>
        <label className="text-sm font-bold text-slate-700">Hasta
          <input type="date" className={field} value={filters.to} min={filters.from || undefined}
            onChange={event => setFilters(current => ({ ...current, to: event.target.value }))} />
        </label>
        <label className="text-sm font-bold text-slate-700">Proveedor
          <select className={field} value={filters.providerId || ""} onChange={event => setFilters(current => ({ ...current, providerId: event.target.value }))}>
            <option value="">Todos</option>{providers.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">Forma de pago
          <select className={field} value={filters.methodId || ""} onChange={event => setFilters(current => ({ ...current, methodId: event.target.value }))}>
            <option value="">Todas</option>{methods.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
        </label>
        <button type="submit" disabled={loadingHistory} className="rounded-xl bg-amber-800 px-4 py-2.5 font-bold text-white disabled:opacity-50">Filtrar</button>
        {(Object.values(filters).some(Boolean) || Object.values(appliedFilters).some(Boolean)) &&
          <button type="button" disabled={loadingHistory} className="rounded-xl px-3 py-2.5 font-bold text-slate-700 underline"
            onClick={() => { setFilters(emptyFilters); void loadHistory(0); }}>Limpiar</button>}
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" aria-busy={loadingHistory}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <caption className="sr-only">Facturas con folio</caption>
            <thead className="bg-slate-100 text-slate-900"><tr>
              <th scope="col" className="px-5 py-3.5">Folio</th>
              <th scope="col" className="px-5 py-3.5">Cliente</th>
              <th scope="col" className="px-5 py-3.5">Fecha</th>
              <th scope="col" className="px-5 py-3.5 text-right">Total (USD)</th>
              <th scope="col" className="px-5 py-3.5 text-right">Pagado</th>
              <th scope="col" className="px-5 py-3.5 text-right">Saldo registrado</th>
              <th scope="col" className="px-5 py-3.5"><span className="sr-only">Acciones</span></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {history.map(invoice => <tr key={invoice.id} className="hover:bg-amber-50/40">
                <th scope="row" className="px-5 py-4 font-black tabular-nums text-[#061b3a]">{folioLabel(invoice.folio)}</th>
                <td className="px-5 py-4 font-medium text-slate-900">{invoice.customer_name}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{dateFormat.format(new Date(invoice.created_at))}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right font-black tabular-nums text-[#061b3a]">{currency.format(invoice.total_cents / 100)}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right">{invoice.payment_control ? currency.format((invoice.paid_cents ?? 0) / 100) : "—"}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right">{invoice.payment_control ? currency.format((invoice.total_cents - (invoice.paid_cents ?? 0)) / 100) : "—"}</td>
                <td className="px-5 py-4 text-right">
                  <button type="button" className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-amber-700 px-3 py-2 font-bold text-slate-900 hover:bg-amber-50"
                    aria-label={"Ver factura " + folioLabel(invoice.folio)} onClick={() => setSaved(invoice)}>
                    <Eye size={17} className="text-amber-800" aria-hidden="true" /> Ver factura
                  </button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {loadingHistory && <p role="status" className="p-5 text-sm text-slate-600">Cargando historial…</p>}
        {!loadingHistory && !error && !history.length && <p className="p-5 text-sm text-slate-600">
          {Object.values(appliedFilters).some(Boolean) ? "No hay facturas que coincidan con los filtros." : "Todavía no hay facturas guardadas."}
        </p>}
        {(page > 0 || hasMore) && <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
          <span className="text-sm text-slate-600">Página {page + 1}</span>
          <div className="flex flex-wrap gap-2">
            {page > 0 && <button type="button" className={button} disabled={loadingHistory} onClick={() => void loadHistory(page - 1, appliedFilters)}>Anterior</button>}
            {hasMore && <button type="button" className={button} disabled={loadingHistory} onClick={() => void loadHistory(page + 1, appliedFilters)}>Siguiente</button>}
          </div>
        </div>}
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
        {lineType && <button type="button" className="rounded-lg border px-3 py-2 text-sm font-bold" onClick={() => { setLineType(""); setProducts([]); setCustoms([]); setLineError(""); }}>Cerrar</button>}
      </div>
      {!contact?.customer_id && <p className="text-sm text-slate-600">Selecciona un cliente para agregar envíos o servicios.</p>}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(lineTypes) as [LineType, string][]).map(([type, label]) => (
          <button key={type} type="button" disabled={!contact?.customer_id || !sameCustomer}
            aria-pressed={lineType === type} onClick={() => { if (type !== lineType) { setProducts([]); setCustoms([]); setLineError(""); setLineType(type); } }}
            className={`rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-40 ${lineType === type ? "border-blue-700 bg-blue-50 text-blue-900" : "border-slate-300 text-slate-700"}`}>
            + {label}
          </button>
        ))}
      </div>
      {lineType === "shipment" && <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">Viaje de referencia (opcional)
          <select className={field} value={tripId} onChange={event => setTripId(event.target.value)}>
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
        <details className="space-y-3 rounded-xl border p-4 sm:col-span-2" open={products.length > 0 || undefined}>
          <summary className="cursor-pointer font-bold">Productos de la tienda física en este envío</summary>
          <PhysicalProductsEditor storeId={picker.storeId} tracksStock={false} value={products} onChange={setProducts}
            onUseWeight={fixed ? undefined : weight => setUnits(String(weight))} />
        </details>
        <div className="space-y-3 rounded-xl border p-4 sm:col-span-2">
          <h3 className="font-bold">Cargos aduanales</h3>
          {customs.map((charge, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
            <label className="text-sm font-bold">Duradero o artículo
              <input className={field} maxLength={160} value={charge.description}
                onChange={event => setCustoms(current => current.map((item, i) => i === index ? { ...item, description: event.target.value } : item))} />
            </label>
            <label className="text-sm font-bold">Importe (USD)
              <input className={field} type="number" min="0.01" step="0.01" value={charge.amount || ""}
                onChange={event => { const amount = Number(event.target.value); setCustoms(current => current.map((item, i) => i === index ? { ...item, amount } : item)); }} />
            </label>
            <button type="button" className="rounded-lg border px-3 py-2" onClick={() => setCustoms(current => current.filter((_, i) => i !== index))}>Quitar</button>
          </div>)}
          <button type="button" className="rounded-lg border px-3 py-2 font-bold" disabled={customs.length >= 99}
            onClick={() => setCustoms(current => [...current, { description: "", amount: 0 }])}>Añadir cargo aduanal</button>
        </div>
        <button type="button" className={button}
          disabled={!recipient || !sameCustomer
            || !validProducts || !service || !Number.isFinite(price) || price <= 0 || !validQuantity}
          onClick={() => {
            if (!service || !recipient) return;
            try {
              const destination = [recipient.name, recipient.address].filter(Boolean).join(" · ");
              addLines({ kind: "shipment", recipientId: recipient.id, serviceId: service.id, description: service.name,
                destination, units: quantity, unit: fixed ? "caja" : "lb", unitPrice: price },
              ...productLines(destination, recipient.id), ...normalizeCustomsCharges(customs).map(charge => ({
                kind: "customs" as const, recipientId: recipient.id, destination, notes: charge.description,
                description: "Aduana · " + charge.description, units: 1, unit: "cargo", unitPrice: charge.amount,
              })));
            } catch (cause) {
              setLineError(cause instanceof Error ? cause.message : "Revisa los cargos aduanales.");
            }
          }}>Agregar envío</button>
      </div>}
      {lineType === "product" && <div className="space-y-4 border-t pt-4">
        <PhysicalProductsEditor storeId={picker.storeId} tracksStock={false} value={products} onChange={setProducts} />
        <button type="button" className={button} disabled={!contact?.customer_id || !sameCustomer || !products.length || !validProducts}
          onClick={() => addLines(...productLines())}>Agregar productos</button>
      </div>}
      {lineType && lineType !== "shipment" && lineType !== "product" && <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">Importe a facturar (USD)
          <input className={field} type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} />
        </label>
        <label className="block text-sm font-bold">{lineType === "other" ? "Nombre del servicio" : "Detalle o referencia externa (opcional)"}
          <input className={field} value={notes} onChange={event => setNotes(event.target.value)} maxLength={200} />
        </label>
        <button type="button" className={button} disabled={!contact?.customer_id || !sameCustomer || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || (lineType === "other" && !notes.trim())}
          onClick={() => {
            addLines({ kind: lineType, notes: notes.trim(), description: [lineType === "other" ? "" : lineTypes[lineType], notes.trim()].filter(Boolean).join(" · "), units: 1, unit: "servicio", unitPrice: Number(amount) });
            setAmount("");
            setNotes("");
          }}>Agregar servicio</button>
      </div>}
      {lineError && <p role="alert" className="text-sm font-bold text-red-700">{lineError}</p>}
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
            <label className="mt-1 block text-sm text-slate-600">Proveedor (opcional)
              <select className={field} value={line.providerId || ""} onChange={event => {
                const providerId = event.target.value;
                setLines(current => current.map(item => item.id === line.id ? { ...item, providerId } : item));
              }}>
                <option value="">Sin proveedor</option>{providers.filter(option => option.active).map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            {line.destination && <p className="text-sm text-slate-600">{line.destination}</p>}
            <p className="text-sm text-slate-600">{line.units} {line.unit} × {currency.format(line.unitPrice)}</p>
          </div>
          <div className="flex items-center gap-3">
            <strong>{currency.format(lineCents(line) / 100)}</strong>
            <button type="button" className="rounded-lg border px-3 py-2 text-sm font-bold text-slate-700"
              aria-label={"Quitar " + line.description} onClick={() => {
                setLines(current => current.filter(item => item.id !== line.id && !(line.kind === "shipment" && line.groupId && item.groupId === line.groupId)));
                if (lines.every(item => item.id === line.id || (line.kind === "shipment" && line.groupId && item.groupId === line.groupId))) setCustomer(null);
              }}>Quitar</button>
          </div>
        </li>)}
      </ul>
      <p aria-live="polite" className="border-t pt-4 text-right text-xl font-black">Total {currency.format(total / 100)}</p>
      {optionsError && <p role="alert" className="text-sm text-red-700">{optionsError}</p>}
      <div className="space-y-3 border-t pt-4">
        <h3 className="font-black">Pagos registrados</h3>
        {payments.map(payment => <div key={payment.id} className="grid gap-2 sm:grid-cols-4 sm:items-end">
          <label className="text-sm font-bold">Forma de pago
            <select className={field} value={payment.methodId} onChange={event => editPayment(payment.id, { methodId: event.target.value })}>
              <option value="">Seleccionar</option>{methods.filter(option => option.active).map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">Importe (USD)
            <input className={field} type="number" min="0.01" step="0.01" value={payment.amount} onChange={event => editPayment(payment.id, { amount: event.target.value })} />
          </label>
          <label className="text-sm font-bold">Referencia (opcional)
            <input className={field} maxLength={120} value={payment.reference} onChange={event => editPayment(payment.id, { reference: event.target.value })} />
          </label>
          <button type="button" className="rounded-lg border px-3 py-2" onClick={() => setPayments(current => current.filter(item => item.id !== payment.id))}>Quitar pago</button>
        </div>)}
        <button type="button" disabled={!methods.some(option => option.active) || payments.length >= 30} className="rounded-lg border px-3 py-2 font-bold disabled:opacity-50"
          onClick={() => setPayments(current => [...current, { id: crypto.randomUUID(), methodId: "", amount: "", reference: "" }])}>Agregar pago</button>
        {!methods.some(option => option.active) && !optionsError && <p className="text-sm text-slate-600">Agrega una opción en Folios → Formas de pago.</p>}
        {payments.length > 0 && <p className="text-sm font-bold">Pagado {currency.format(paid / 100)} · Saldo {currency.format((total - paid) / 100)}</p>}
      </div>
      {error && <p role="alert" className="text-sm font-bold text-red-700">{error}</p>}
      <button type="button" className={button} disabled={saving || !lines.length || Boolean(lineType)} onClick={() => void saveFolio()}>
        {saving ? "Guardando…" : "Guardar factura"}
      </button>
      {lineType && lines.length > 0 && <p className="text-sm text-slate-600">Agrega el concepto abierto o ciérralo antes de guardar.</p>}
    </section>
    </fieldset>}
  </div>;
}


function CompactInvoice({ invoice }: { invoice: Folio }) {
  const recipients = new Map<string, PrintContact>();
  const recipientKeys = invoice.lines.map(line => {
    if (!line.destination) return null;
    const key = line.recipientId || line.destination;
    if (!recipients.has(key)) {
      const [name, ...address] = line.destination.split(" · ");
      recipients.set(key, {
        name, address: address.join(" · "),
        ...(line.recipientId ? invoice.recipient_contacts?.[line.recipientId] : undefined),
      });
    }
    return key;
  });
  const recipientList = [...recipients.entries()];
  const sender = { ...invoice.sender_contact, name: invoice.customer_name };
  const showRecipientReferences = recipientList.length > 1;

  return <article id="luxury-folio-print" className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-950 sm:p-6">
    <style>{`@media print {
      @page { size: letter; margin: 12mm; }
      body:has(#luxury-folio-print) :not(:has(#luxury-folio-print)):not(#luxury-folio-print):not(#luxury-folio-print *) { display: none !important; }
      body:has(#luxury-folio-print) *:has(#luxury-folio-print) { display: block !important; position: static !important; overflow: visible !important; height: auto !important; min-height: 0 !important; padding: 0 !important; margin: 0 !important; }
      #luxury-folio-print { max-width: none; margin: 0; padding: 0; border: 0; font-size: 10pt; line-height: 1.25; }
      #luxury-folio-print th, #luxury-folio-print td { padding: 3pt 5pt; }
      #luxury-folio-print tr, #luxury-folio-print .folio-contact, #luxury-folio-print .folio-total { break-inside: avoid; }
      #luxury-folio-print thead { display: table-header-group; }
      #luxury-folio-print .folio-contacts { display: grid; grid-template-columns: 1fr 1fr; }
    }`}</style>
    <header className="flex items-start justify-between gap-3 border-b border-slate-400 pb-2">
      <Image src="/luxury/footer-logo-transparent.webp" alt="Luxury Travel Point"
        width={1008} height={659} unoptimized loading="eager"
        className="h-20 w-auto max-w-[50%] object-contain object-left print:h-[16mm]" />
      <div className="shrink-0 text-right">
        <p className="font-black">Factura · Folio {folioLabel(invoice.folio)}</p>
        <p>{dateFormat.format(new Date(invoice.created_at))}</p>
      </div>
    </header>
    <div className="folio-contacts grid gap-3 border-b border-slate-300 py-2 sm:grid-cols-2">
      <ContactBlock label="Remitente" contact={sender} />
      {recipientList.length > 0 && <div className="space-y-2">
        {recipientList.map(([key, contact], index) => <ContactBlock key={key}
          label={showRecipientReferences ? `Destinatario ${index + 1}` : "Destinatario"} contact={contact} />)}
      </div>}
    </div>
    <table className="mt-3 w-full border-collapse text-left">
      <thead><tr className="border-b border-slate-400 bg-slate-100">
        <th scope="col" className="p-2">Concepto</th>
        <th scope="col" className="p-2 text-right">Cantidad</th>
        <th scope="col" className="p-2 text-right">Precio</th>
        <th scope="col" className="p-2 text-right">Importe</th>
      </tr></thead>
      <tbody>
        {invoice.lines.map((line, index) => <tr key={index} className="border-b border-slate-200">
          <td className="break-words p-2">
            {line.description}
            {showRecipientReferences && recipientKeys[index] && <span className="ml-1 text-xs text-slate-600">
              (Dest. {recipientList.findIndex(([key]) => key === recipientKeys[index]) + 1})
            </span>}
          </td>
          <td className="whitespace-nowrap p-2 text-right">{line.units} {line.unit === "unidad" ? "ud." : line.unit}</td>
          <td className="whitespace-nowrap p-2 text-right">{currency.format(line.unitPrice)}</td>
          <td className="whitespace-nowrap p-2 text-right font-bold">{currency.format(line.cents / 100)}</td>
        </tr>)}
      </tbody>
    </table>
    <div className="folio-total mt-3 text-right">
      <p className="text-base font-black">Total USD {currency.format(invoice.total_cents / 100)}</p>
      {invoice.payment_control ? <>
        {(invoice.payments ?? []).map((payment, index) => <p key={index}>{payment.methodName} · {currency.format(payment.cents / 100)}</p>)}
        <p className="font-bold">Pagado {currency.format((invoice.paid_cents ?? 0) / 100)} · Saldo {currency.format((invoice.total_cents - (invoice.paid_cents ?? 0)) / 100)}</p>
      </> : null}
    </div>
  </article>;
}

function ContactBlock({ label, contact }: { label: string; contact: PrintContact }) {
  return <section className="folio-contact min-w-0 break-words">
    <h3 className="text-xs font-black uppercase">{label}</h3>
    {contact.name && <p className="font-semibold">{contact.name}</p>}
    {contact.phone && <p>Tel. {contact.phone}</p>}
    {contact.address && <p>{contact.address}</p>}
  </section>;
}
