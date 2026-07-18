"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Contact,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Search,
  Star,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import {
  findShippingCustomerByPhone,
  saveShippingCustomer,
  saveShippingRecipient,
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
  onApply,
}: {
  storeId: string;
  countries: ShippingCountry[];
  provinces: ShippingProvince[];
  municipalities: ShippingMunicipality[];
  locations: ShippingLocation[];
  initialPhone?: string;
  onApply: (selection: CustomerSelection) => void;
}) {
  const [phone, setPhone] = useState(initialPhone);
  const [customer, setCustomer] = useState<ShippingCustomer | null>(null);
  const [recipients, setRecipients] = useState<ShippingRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [creatingRecipient, setCreatingRecipient] = useState(false);

  const [customerName, setCustomerName] = useState("");
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
    () =>
      municipalities.filter(
        (item) => !provinceId || item.province_id === provinceId
      ),
    [municipalityId, provinceId, municipalities]
  );

  const visibleLocations = useMemo(
    () =>
      locations.filter(
        (item) => !municipalityId || item.municipality_id === municipalityId
      ),
    [locations, municipalityId]
  );

  function digits(value: string) {
    return value.replace(/\D/g, "").slice(0, 15);
  }

  async function searchCustomer() {
    const normalized = digits(phone);

    if (!normalized) {
      setMessage("Escribe el teléfono del cliente.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await findShippingCustomerByPhone(
      storeId,
      normalized
    );

    setLoading(false);

    if (error) {
      setMessage(error.message || "No se pudo buscar el cliente.");
      return;
    }

    if (!data?.customer) {
      setCustomer(null);
      setRecipients([]);
      setCreatingCustomer(true);
      setCustomerName("");
      setMessage("Cliente no encontrado. Puedes registrarlo ahora.");
      return;
    }

    setCustomer(data.customer);
    setRecipients(data.recipients || []);
    setCreatingCustomer(false);
    setMessage("");
    onApply({
      customer_id: data.customer.id,
      recipient_id: null,
      sender_name: data.customer.name,
      sender_phone: data.customer.phone,
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
    if (!customerName.trim() || !digits(phone)) {
      setMessage("Nombre y teléfono del cliente son obligatorios.");
      return;
    }

    setLoading(true);
    const { data, error } = await saveShippingCustomer({
      store_id: storeId,
      name: customerName,
      phone: digits(phone),
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
    setMessage("Cliente creado. Ahora agrega su primer destinatario.");

    onApply({
      customer_id: data.id,
      recipient_id: null,
      sender_name: data.name,
      sender_phone: data.phone,
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

  function applyRecipient(recipient: ShippingRecipient) {
    const customerData = customer;
    if (!customerData) return;

    onApply({
      customer_id: customerData.id,
      recipient_id: recipient.id,
      sender_name: customerData.name,
      sender_phone: customerData.phone,
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

  async function createRecipient() {
    if (!customer?.id) {
      setMessage("Primero selecciona o crea el cliente.");
      return;
    }

    if (
      !recipientName.trim() ||
      !digits(recipientPhone) ||
      !recipientAddress.trim()
    ) {
      setMessage(
        "Nombre, teléfono y dirección del destinatario son obligatorios."
      );
      return;
    }

    const selectedLocation = locations.find(
      (item) => item.id === locationId
    );

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
    setMessage("Destinatario guardado y aplicado al envío.");
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
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">
              Cliente y destinatarios
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">
              Buscar cliente por teléfono
            </h2>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Al encontrarlo se completan sus datos y puedes elegir uno de sus
              destinatarios guardados.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Phone
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(digits(event.target.value))}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchCustomer();
                }
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Ej. 3051234567"
            />
          </label>

          <button
            type="button"
            onClick={() => void searchCustomer()}
            disabled={loading || !phone}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Search size={18} />
            )}
            Buscar
          </button>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
            {message}
          </div>
        )}
      </div>

      <div className="space-y-5 p-5 md:p-6">
        {customer && (
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                  <UserRound size={20} />
                </div>
                <div>
                  <p className="font-extrabold text-emerald-950">
                    {customer.name}
                  </p>
                  <p className="text-sm font-medium text-emerald-800/70">
                    {customer.phone} · Cliente #{customer.customer_number}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreatingRecipient(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 shadow-sm"
              >
                <Plus size={16} />
                Nuevo destinatario
              </button>
            </div>
          </div>
        )}

        {recipients.length > 0 && !creatingRecipient && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-950">
                  Destinatarios guardados
                </h3>
                <p className="text-sm font-medium text-slate-500">
                  Selecciona la persona que recibirá esta operación.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {recipients
                .filter((item) => item.is_active)
                .sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite))
                .map((recipient) => (
                  <button
                    type="button"
                    key={recipient.id}
                    onClick={() => applyRecipient(recipient)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                          <Contact size={19} />
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-extrabold text-slate-950">
                            <span className="truncate">{recipient.name}</span>
                            {recipient.is_favorite && (
                              <Star
                                size={14}
                                className="fill-amber-400 text-amber-400"
                              />
                            )}
                          </p>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {recipient.phone}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-400">
                            {recipient.address}
                          </p>
                          {recipient.identity_card && (
                            <p className="mt-2 text-xs font-bold text-blue-700">
                              CI: {recipient.identity_card}
                            </p>
                          )}
                        </div>
                      </div>
                      <CheckCircle2 size={19} className="text-blue-600" />
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {creatingCustomer && (
          <EditorCard
            title="Registrar nuevo cliente"
            onClose={() => setCreatingCustomer(false)}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre completo">
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Teléfono">
                <input value={phone} readOnly className={inputClass} />
              </Field>
              <Field label="Correo opcional">
                <input
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Dirección en Estados Unidos">
                <input
                  value={customerAddress}
                  onChange={(event) => setCustomerAddress(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => void createCustomer()}
              disabled={loading}
              className={primaryButton}
            >
              <Plus size={17} />
              Crear cliente
            </button>
          </EditorCard>
        )}

        {creatingRecipient && customer && (
          <EditorCard
            title={`Nuevo destinatario para ${customer.name}`}
            onClose={() => setCreatingRecipient(false)}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre completo">
                <input
                  value={recipientName}
                  onChange={(event) => setRecipientName(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Teléfono">
                <input
                  value={recipientPhone}
                  onChange={(event) =>
                    setRecipientPhone(digits(event.target.value))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Carnet de identidad">
                <input
                  value={identityCard}
                  onChange={(event) =>
                    setIdentityCard(event.target.value.replace(/\s/g, ""))
                  }
                  className={inputClass}
                  placeholder="Opcional por ahora"
                />
              </Field>
              <Field label="Relación con el cliente">
                <input
                  value={relationship}
                  onChange={(event) => setRelationship(event.target.value)}
                  className={inputClass}
                  placeholder="Madre, hermano, amigo..."
                />
              </Field>
              <Field label="País">
                <select
                  value={countryId}
                  onChange={(event) => {
                    setCountryId(event.target.value);
                    setProvinceId("");
                    setMunicipalityId("");
                    setLocationId("");
                  }}
                  className={inputClass}
                >
                  <option value="">Seleccionar</option>
                  {countries
                    .filter((item) => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Provincia">
                <select
                  value={provinceId}
                  onChange={(event) => {
                    setProvinceId(event.target.value);
                    setMunicipalityId("");
                    setLocationId("");
                  }}
                  className={inputClass}
                >
                  <option value="">Seleccionar</option>
                  {visibleProvinces
                    .filter((item) => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Municipio">
                <select
                  value={municipalityId}
                  onChange={(event) => {
                    setMunicipalityId(event.target.value);
                    setLocationId("");
                  }}
                  className={inputClass}
                >
                  <option value="">Seleccionar</option>
                  {visibleMunicipalities
                    .filter((item) => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Lugar de entrega">
                <select
                  value={locationId}
                  onChange={(event) => setLocationId(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar</option>
                  {visibleLocations
                    .filter((item) => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Dirección completa en Cuba">
                  <textarea
                    value={recipientAddress}
                    onChange={(event) =>
                      setRecipientAddress(event.target.value)
                    }
                    className={`${inputClass} min-h-24`}
                  />
                </Field>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void createRecipient()}
              disabled={loading}
              className={primaryButton}
            >
              <Plus size={17} />
              Guardar y usar destinatario
            </button>
          </EditorCard>
        )}
      </div>
    </section>
  );
}

function EditorCard({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="rounded-3xl border border-blue-100 bg-blue-50/50 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-extrabold text-slate-950">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border bg-white p-2 text-slate-500"
        >
          <X size={17} />
        </button>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

const primaryButton =
  "mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-bold text-white disabled:opacity-40";
