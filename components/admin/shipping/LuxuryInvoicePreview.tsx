"use client";

import { useState, type ComponentProps } from "react";
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

const lineTypes = { shipment: "Envío", passport: "Pasaporte", remittance: "Remesa registrada en otro sistema" } as const;
type LineType = keyof typeof lineTypes;

type Line = {
  id: string;
  description: string;
  destination?: string;
  units: number;
  unit: string;
  unitPrice: number;
};

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

  const availableServices = services.filter(service => service.is_active && service.code.startsWith("luxury-"));
  const service = availableServices.find(item => item.id === serviceId);
  const fixed = service?.billing_mode === "fixed";
  const recipient = recipients.find(item => item.id === recipientId && item.is_active);
  const rate = rates.find(item => item.is_active && item.service_type_id === serviceId
    && item.scope_type === "country" && item.country_id === recipient?.country_id);
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
    <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
      Vista previa. Los renglones se pierden al salir y todavía no se puede emitir la factura.
    </p>
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
        <label className="block text-sm font-bold">Viaje compartido
          <select className={field} value={tripId} disabled={fixedTrip} onChange={event => setTripId(event.target.value)}>
            <option value="">Selecciona un viaje</option>
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
          disabled={!recipient || !sameCustomer || !trips.some(trip => trip.id === tripId)
            || !service || !Number.isFinite(price) || price <= 0 || !validQuantity}
          onClick={() => {
            if (!service || !recipient) return;
            addLine({ description: service.name, destination: [recipient.name, recipient.address].filter(Boolean).join(" · "),
              units: quantity, unit: fixed ? "caja" : "lb", unitPrice: price });
          }}>Agregar envío</button>
      </div>}
      {lineType && lineType !== "shipment" && <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
        <label className="block text-sm font-bold">Importe a facturar (USD)
          <input className={field} type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} />
        </label>
        <label className="block text-sm font-bold">Detalle o referencia externa (opcional)
          <input className={field} value={notes} onChange={event => setNotes(event.target.value)} maxLength={200} />
        </label>
        <button type="button" className={button} disabled={!contact?.customer_id || !sameCustomer || !Number.isFinite(Number(amount)) || Number(amount) <= 0}
          onClick={() => {
            addLine({ description: [lineTypes[lineType], notes.trim()].filter(Boolean).join(" · "), units: 1, unit: "servicio", unitPrice: Number(amount) });
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
    </section>
  </div>;
}
