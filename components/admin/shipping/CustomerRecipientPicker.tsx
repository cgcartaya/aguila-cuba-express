"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Contact,
  GripVertical,
  Loader2,
  Phone,
  Plus,
  Search,
  Star,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import {
  findShippingCustomerDuplicate,
  getShippingCustomerWithRecipients,
  saveShippingCustomer,
  saveShippingRecipient,
  searchShippingCustomers,
} from "@/lib/services/shipping-customers";
import type {
  ShippingCustomer,
  ShippingRecipient,
} from "@/lib/shipping/customer-types";
import type {
  ShippingCountry,
  ShippingLocation,
  ShippingMunicipality,
  ShippingProvince,
} from "@/lib/shipping/types";

export type CustomerSelection = {
  customer_id: string | null;
  recipient_id: string | null;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_identity_card: string;
  country_id: string | null;
  province_id: string | null;
  municipality_id: string | null;
  shipping_location_id: string | null;
  location: string;
};

export default function CustomerRecipientPicker({
  storeId,
  countries,
  provinces,
  municipalities,
  locations,
  initialPhone = "",
  initialCustomerId = "",
  initialRecipientId = "",
  onApply,
}: {
  storeId: string;
  countries: ShippingCountry[];
  provinces: ShippingProvince[];
  municipalities: ShippingMunicipality[];
  locations: ShippingLocation[];
  initialPhone?: string;
  initialCustomerId?: string;
  initialRecipientId?: string;
  onApply: (selection: CustomerSelection) => void;
}) {
  const [search, setSearch] = useState(initialPhone);
  const [results, setResults] = useState<ShippingCustomer[]>([]);
  const [customer, setCustomer] = useState<ShippingCustomer | null>(null);
  const [recipients, setRecipients] = useState<ShippingRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingRecipient, setCreatingRecipient] = useState(false);
  const searchRequestRef = useRef(0);
  const suppressNextRealtimeSearchRef = useRef(false);
  const initialSelectionLoadedRef = useRef(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState(digits(initialPhone));
  const [customerBirthDate, setCustomerBirthDate] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [identityCard, setIdentityCard] = useState("");
  const [countryId, setCountryId] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [municipalityId, setMunicipalityId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [relationship, setRelationship] = useState("");

  const visibleProvinces = useMemo(
    () => provinces.filter((item) => !countryId || item.country_id === countryId),
    [countryId, provinces]
  );

  const visibleMunicipalities = useMemo(
    () => municipalities.filter((item) => !provinceId || item.province_id === provinceId),
    [provinceId, municipalities]
  );

  const visibleLocations = useMemo(
    () => locations.filter((item) => !municipalityId || item.municipality_id === municipalityId),
    [locations, municipalityId]
  );


  useEffect(() => {
    if (!initialCustomerId || initialSelectionLoadedRef.current) return;
    initialSelectionLoadedRef.current = true;

    void (async () => {
      setLoading(true);
      setMessage("Cargando cliente seleccionado...");
      const { data, error } = await getShippingCustomerWithRecipients(
        storeId,
        initialCustomerId
      );
      setLoading(false);

      if (error || !data?.customer) {
        setMessage(error?.message || "No se pudo cargar el cliente seleccionado.");
        return;
      }

      setCustomer(data.customer);
      setRecipients(data.recipients || []);
      setResults([]);
      setCreatingCustomer(false);
      setCreatingRecipient(false);
      suppressNextRealtimeSearchRef.current = true;
      setSearch(`${data.customer.customer_code} · ${data.customer.name}`);
      applyCustomer(data.customer);

      const selectedRecipient = (data.recipients || []).find(
        (recipient) => recipient.id === initialRecipientId
      );
      if (selectedRecipient) {
        applyRecipientForCustomer(data.customer, selectedRecipient);
        setMessage(`Cliente y destinatario ${selectedRecipient.name} cargados.`);
      } else {
        setMessage("Cliente cargado. Selecciona uno de sus destinatarios.");
      }
    })();
  }, [initialCustomerId, initialRecipientId, storeId]);

  async function runSearch(termOverride?: string, openNewCustomerWhenEmpty = false) {
    const term = (termOverride ?? search).trim();
    if (term.length < 2) {
      setResults([]);
      setMessage(term.length ? "Escribe al menos 2 caracteres: código, nombre o teléfono." : "");
      return;
    }

    const requestId = ++searchRequestRef.current;
    setLoading(true);
    setMessage("");
    const { data, error } = await searchShippingCustomers(storeId, term);

    if (requestId !== searchRequestRef.current) return;
    setLoading(false);

    if (error) {
      setResults([]);
      setMessage(error.message || "No se pudo buscar el cliente.");
      return;
    }

    setResults(data);
    if (!data.length) {
      setCustomerPhone(digits(term));
      if (openNewCustomerWhenEmpty) setCreatingCustomer(true);
      setMessage("No encontramos coincidencias. Puedes registrar un cliente nuevo.");
    }
  }

  useEffect(() => {
    if (suppressNextRealtimeSearchRef.current) {
      suppressNextRealtimeSearchRef.current = false;
      return;
    }

    const term = search.trim();
    if (term.length < 2) {
      searchRequestRef.current += 1;
      setLoading(false);
      setResults([]);
      setMessage(term.length ? "Escribe al menos 2 caracteres: código, nombre o teléfono." : "");
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(term, false);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, storeId]);

  async function selectCustomer(selected: ShippingCustomer) {
    setLoading(true);
    setMessage("");
    const { data, error } = await getShippingCustomerWithRecipients(storeId, selected.id);
    setLoading(false);

    if (error || !data?.customer) {
      setMessage(error?.message || "No se pudo cargar el cliente.");
      return;
    }

    setCustomer(data.customer);
    setRecipients(data.recipients || []);
    setResults([]);
    setCreatingCustomer(false);
    setCreatingRecipient(false);
    suppressNextRealtimeSearchRef.current = true;
    setSearch(`${data.customer.customer_code} · ${data.customer.name}`);
    applyCustomer(data.customer);
  }

  function applyCustomer(selected: ShippingCustomer) {
    onApply({
      customer_id: selected.id,
      recipient_id: null,
      sender_name: selected.name,
      sender_phone: selected.phone,
      recipient_name: "",
      recipient_phone: "",
      recipient_address: "",
      recipient_identity_card: "",
      country_id: null,
      province_id: null,
      municipality_id: null,
      shipping_location_id: null,
      location: "",
    });
  }

  async function createCustomer() {
    const normalizedPhone = digits(customerPhone);
    if (!customerName.trim() || !normalizedPhone || !customerBirthDate) {
      setMessage("Nombre, teléfono y fecha de nacimiento son obligatorios.");
      return;
    }

    setLoading(true);
    setMessage("");

    const duplicate = await findShippingCustomerDuplicate(
      storeId,
      normalizedPhone,
      customerBirthDate
    );

    if (duplicate.error) {
      setLoading(false);
      setMessage(duplicate.error.message || "No se pudo validar el cliente.");
      return;
    }

    if (duplicate.data) {
      setLoading(false);
      setMessage(`Este cliente ya existe como ${duplicate.data.customer_code} · ${duplicate.data.name}.`);
      await selectCustomer(duplicate.data);
      return;
    }

    const { data, error } = await saveShippingCustomer({
      store_id: storeId,
      name: customerName,
      phone: normalizedPhone,
      birth_date: customerBirthDate,
      email: customerEmail,
      address: customerAddress,
    });
    setLoading(false);

    if (error || !data) {
      setMessage(error?.message || "No se pudo crear el cliente.");
      return;
    }

    setCustomer(data);
    setRecipients([]);
    setCreatingCustomer(false);
    setCreatingRecipient(true);
    suppressNextRealtimeSearchRef.current = true;
    setSearch(`${data.customer_code} · ${data.name}`);
    setMessage(`Cliente ${data.customer_code} creado. Ahora agrega o selecciona un destinatario.`);
    applyCustomer(data);
  }

  function applyRecipientForCustomer(
    selectedCustomer: ShippingCustomer,
    recipient: ShippingRecipient
  ) {
    onApply({
      customer_id: selectedCustomer.id,
      recipient_id: recipient.id,
      sender_name: selectedCustomer.name,
      sender_phone: selectedCustomer.phone,
      recipient_name: recipient.name,
      recipient_phone: recipient.phone,
      recipient_address: recipient.address,
      recipient_identity_card: recipient.identity_card || "",
      country_id: recipient.country_id,
      province_id: recipient.province_id,
      municipality_id: recipient.municipality_id,
      shipping_location_id: recipient.shipping_location_id,
      location: recipient.legacy_location || "",
    });
  }

  function applyRecipient(recipient: ShippingRecipient) {
    if (!customer) return;
    applyRecipientForCustomer(customer, recipient);
    setMessage(`Destinatario ${recipient.name} aplicado al envío.`);
  }

  async function createRecipient() {
    if (!customer?.id) return setMessage("Primero selecciona o crea el cliente.");
    if (!recipientName.trim() || !digits(recipientPhone) || !recipientAddress.trim()) {
      return setMessage("Nombre, teléfono y dirección del destinatario son obligatorios.");
    }

    const selectedLocation = locations.find((item) => item.id === locationId);
    setLoading(true);
    const { data, error } = await saveShippingRecipient({
      store_id: storeId,
      customer_id: customer.id,
      name: recipientName,
      phone: digits(recipientPhone),
      address: recipientAddress,
      identity_card: identityCard,
      country_id: countryId || null,
      province_id: provinceId || null,
      municipality_id: municipalityId || null,
      shipping_location_id: locationId || null,
      legacy_location: selectedLocation?.legacy_code || "",
      relationship,
      is_favorite: recipients.length === 0,
    });
    setLoading(false);

    if (error || !data) {
      setMessage(error?.message || "No se pudo guardar el destinatario.");
      return;
    }

    setRecipients((current) => [...current, data]);
    setCreatingRecipient(false);
    setMessage("Destinatario guardado, asociado al cliente y aplicado al envío.");
    applyRecipient(data);
  }

  return (
    <section className="overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#061b3a] text-white">
            <UsersRound size={23} />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">CRM de envíos</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">Buscar cliente existente</h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Busca por código AG-0000, nombre o teléfono. Al seleccionarlo se cargan sus destinatarios.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCustomer(null);
                setRecipients([]);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void runSearch();
                }
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Ej. AG-0043, Carlos García o 3051234567"
            />
          </label>
          <button type="button" onClick={() => void runSearch(undefined, true)} disabled={loading} className={darkButton}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Buscar
          </button>
          <button
            type="button"
            onClick={() => {
              setCreatingCustomer(true);
              setCustomerPhone(digits(search));
              setResults([]);
            }}
            className={lightButton}
          >
            <Plus size={18} /> Nuevo cliente
          </button>
        </div>

        {results.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
            {results.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => void selectCustomer(item)}
                className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-blue-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <UserRound size={18} className="shrink-0 text-blue-700" />
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-slate-950">{item.customer_code} · {item.name}</p>
                    <p className="text-xs font-semibold text-slate-500">{item.phone}{item.birth_date ? ` · Nac. ${formatDate(item.birth_date)}` : ""}</p>
                  </div>
                </div>
                <CheckCircle2 size={18} className="shrink-0 text-blue-600" />
              </button>
            ))}
          </div>
        )}

        {message && <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">{message}</div>}
      </div>

      <div className="space-y-5 p-5 md:p-6">
        {customer && (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white"><UserRound size={20} /></div>
                <div>
                  <p className="font-extrabold text-emerald-950">{customer.customer_code} · {customer.name}</p>
                  <p className="text-sm font-medium text-emerald-800/70">{customer.phone}{customer.birth_date ? ` · ${formatDate(customer.birth_date)}` : ""}</p>
                </div>
              </div>
              <button type="button" onClick={() => setCreatingRecipient(true)} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm">
                <Plus size={16} /> Nuevo destinatario
              </button>
            </div>
          </div>
        )}

        {recipients.length > 0 && !creatingRecipient && (
          <div>
            <h3 className="font-extrabold text-slate-950">Destinatarios guardados</h3>
            <p className="mb-3 text-sm font-medium text-slate-500">El mismo destinatario puede estar asociado con diferentes clientes.</p>
            <div className="grid gap-3 md:grid-cols-2">
              {recipients.filter((item) => item.is_active).sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite)).map((recipient) => (
                <button type="button" key={recipient.id} onClick={() => applyRecipient(recipient)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50">
                  <div className="flex items-start gap-3">
                    <GripVertical size={18} className="mt-1 text-slate-300" />
                    <Contact size={19} className="mt-1 text-blue-700" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-extrabold text-slate-950">{recipient.name}{recipient.is_favorite && <Star size={14} className="fill-amber-400 text-amber-400" />}</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">{recipient.phone}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-400">{recipient.address}</p>
                    </div>
                    <CheckCircle2 size={19} className="text-blue-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {creatingCustomer && (
          <EditorCard title="Registrar nuevo cliente" onClose={() => setCreatingCustomer(false)}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre completo"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} /></Field>
              <Field label="Teléfono"><input value={customerPhone} onChange={(e) => setCustomerPhone(digits(e.target.value))} className={inputClass} inputMode="numeric" /></Field>
              <Field label="Fecha de nacimiento"><input type="date" value={customerBirthDate} onChange={(e) => setCustomerBirthDate(e.target.value)} className={inputClass} /></Field>
              <Field label="Correo opcional"><input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} className={inputClass} /></Field>
              <Field label="Dirección en Estados Unidos"><input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className={inputClass} /></Field>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
              La validación de duplicados usa tienda + teléfono normalizado + fecha de nacimiento.
            </div>
            <button type="button" onClick={() => void createCustomer()} disabled={loading} className={primaryButton}><Plus size={17} /> Validar y crear cliente</button>
          </EditorCard>
        )}

        {creatingRecipient && customer && (
          <EditorCard title={`Nuevo destinatario para ${customer.name}`} onClose={() => setCreatingRecipient(false)}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre completo"><input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} className={inputClass} /></Field>
              <Field label="Teléfono"><input value={recipientPhone} onChange={(e) => setRecipientPhone(digits(e.target.value))} className={inputClass} inputMode="numeric" /></Field>
              <Field label="Carnet de identidad"><input value={identityCard} onChange={(e) => setIdentityCard(e.target.value.replace(/\s/g, ""))} className={inputClass} /></Field>
              <Field label="Relación con el cliente"><input value={relationship} onChange={(e) => setRelationship(e.target.value)} className={inputClass} placeholder="Madre, hermano, amigo..." /></Field>
              <Field label="País"><select value={countryId} onChange={(e) => { setCountryId(e.target.value); setProvinceId(""); setMunicipalityId(""); setLocationId(""); }} className={inputClass}><option value="">Seleccionar</option>{countries.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
              <Field label="Provincia"><select value={provinceId} onChange={(e) => { setProvinceId(e.target.value); setMunicipalityId(""); setLocationId(""); }} className={inputClass}><option value="">Seleccionar</option>{visibleProvinces.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
              <Field label="Municipio"><select value={municipalityId} onChange={(e) => { setMunicipalityId(e.target.value); setLocationId(""); }} className={inputClass}><option value="">Seleccionar</option>{visibleMunicipalities.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
              <Field label="Lugar"><select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}><option value="">Seleccionar</option>{visibleLocations.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
              <div className="md:col-span-2"><Field label="Dirección completa"><textarea value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} className={`${inputClass} min-h-24`} /></Field></div>
            </div>
            <button type="button" onClick={() => void createRecipient()} disabled={loading} className={primaryButton}><Plus size={17} /> Guardar y usar destinatario</button>
          </EditorCard>
        )}
      </div>
    </section>
  );
}

function digits(value: string) {
  return String(value || "").replace(/\D/g, "").slice(0, 15);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("es-US");
}

function EditorCard({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-4 md:p-5"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-extrabold text-slate-950">{title}</h3><button type="button" onClick={onClose} className="rounded-xl bg-white p-2 text-slate-500"><X size={18} /></button></div><div className="space-y-4">{children}</div></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-700">{label === "Fecha de nacimiento" && <CalendarDays size={15} />}{label === "Teléfono" && <Phone size={15} />}{label}</span>{children}</label>;
}

const inputClass = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white disabled:opacity-40";
const darkButton = "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-bold text-white disabled:opacity-40";
const lightButton = "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700";
