"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Contact,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  PackagePlus,
  Phone,
  Plus,
  Search,
  Star,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";

import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useStore } from "@/hooks/useStore";
import {
  getShippingCustomerDetail,
  saveShippingRecipient,
} from "@/lib/services/shipping-customers";
import { getShippingConfiguration } from "@/lib/services/shipping-settings";
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

function money(value?: number) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function customerCode(customer: ShippingCustomer) {
  return customer.customer_code || `AG-${String(customer.customer_number).padStart(4, "0")}`;
}

export default function ShippingCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { loading: accessLoading, isSuperAdmin, store: accessStore } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();

  const activeStore = useMemo(
    () => (isSuperAdmin ? selectedStore || accessStore : accessStore),
    [accessStore, isSuperAdmin, selectedStore]
  );

  const [customer, setCustomer] = useState<ShippingCustomer | null>(null);
  const [recipients, setRecipients] = useState<ShippingRecipient[]>([]);
  const [shipments, setShipments] = useState<Array<Record<string, any>>>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showRecipientModal, setShowRecipientModal] = useState(false);
  const [savingRecipient, setSavingRecipient] = useState(false);
  const [message, setMessage] = useState("");

  const [countries, setCountries] = useState<ShippingCountry[]>([]);
  const [provinces, setProvinces] = useState<ShippingProvince[]>([]);
  const [municipalities, setMunicipalities] = useState<ShippingMunicipality[]>([]);
  const [locations, setLocations] = useState<ShippingLocation[]>([]);

  const [recipientForm, setRecipientForm] = useState({
    name: "",
    phone: "",
    address: "",
    identity_card: "",
    relationship: "",
    country_id: "",
    province_id: "",
    municipality_id: "",
    shipping_location_id: "",
    notes: "",
  });

  async function load() {
    if (!activeStore?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [detail, config] = await Promise.all([
      getShippingCustomerDetail(activeStore.id, id),
      getShippingConfiguration(activeStore.id),
    ]);

    setCustomer(detail.data?.customer || null);
    setRecipients(detail.data?.recipients || []);
    setShipments(detail.data?.shipments || []);
    setCountries(config.countries || []);
    setProvinces(config.provinces || []);
    setMunicipalities(config.municipalities || []);
    setLocations(config.locations || []);
    setLoading(false);
  }

  useEffect(() => {
    if (!accessLoading && !storeLoading) void load();
  }, [accessLoading, storeLoading, activeStore?.id, id]);

  const filteredRecipients = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();
    const phone = recipientSearch.replace(/\D/g, "");
    return recipients.filter(
      (recipient) =>
        !query ||
        recipient.name.toLowerCase().includes(query) ||
        recipient.phone.includes(phone || query) ||
        recipient.address.toLowerCase().includes(query)
    );
  }, [recipientSearch, recipients]);

  const visibleProvinces = useMemo(
    () => provinces.filter((item) => !recipientForm.country_id || item.country_id === recipientForm.country_id),
    [provinces, recipientForm.country_id]
  );
  const visibleMunicipalities = useMemo(
    () => municipalities.filter((item) => !recipientForm.province_id || item.province_id === recipientForm.province_id),
    [municipalities, recipientForm.province_id]
  );
  const visibleLocations = useMemo(
    () => locations.filter((item) => !recipientForm.municipality_id || item.municipality_id === recipientForm.municipality_id),
    [locations, recipientForm.municipality_id]
  );

  async function createRecipient() {
    if (!activeStore?.id || !customer?.id) return;
    const phone = recipientForm.phone.replace(/\D/g, "");
    if (!recipientForm.name.trim() || !phone || !recipientForm.address.trim()) {
      setMessage("Nombre, teléfono y dirección son obligatorios.");
      return;
    }

    const selectedLocation = locations.find((item) => item.id === recipientForm.shipping_location_id);
    setSavingRecipient(true);
    setMessage("");
    const { data, error } = await saveShippingRecipient({
      store_id: activeStore.id,
      customer_id: customer.id,
      name: recipientForm.name.trim(),
      phone,
      address: recipientForm.address.trim(),
      identity_card: recipientForm.identity_card,
      relationship: recipientForm.relationship,
      country_id: recipientForm.country_id || null,
      province_id: recipientForm.province_id || null,
      municipality_id: recipientForm.municipality_id || null,
      shipping_location_id: recipientForm.shipping_location_id || null,
      legacy_location: selectedLocation?.legacy_code || "",
      notes: recipientForm.notes,
      is_favorite: recipients.length === 0,
    });
    setSavingRecipient(false);

    if (error || !data) {
      setMessage(error?.message || "No se pudo guardar el destinatario.");
      return;
    }

    setRecipients((current) => [...current, data]);
    setRecipientForm({
      name: "",
      phone: "",
      address: "",
      identity_card: "",
      relationship: "",
      country_id: "",
      province_id: "",
      municipality_id: "",
      shipping_location_id: "",
      notes: "",
    });
    setShowRecipientModal(false);
    setMessage("Destinatario guardado correctamente.");
  }

  if (loading || accessLoading || storeLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-10 text-center font-bold text-slate-500">
        <Loader2 className="mx-auto mb-3 animate-spin" />
        Cargando expediente...
      </main>
    );
  }

  if (!customer) {
    return <main className="p-10 text-center font-bold text-red-700">Cliente no encontrado.</main>;
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] p-3 pb-28 sm:p-5 lg:p-7 lg:pb-10">
      <div className="mx-auto max-w-[1450px] space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/admin/customers" className="inline-flex w-fit items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">
            <ArrowLeft size={18} /> Volver a clientes
          </Link>
          <Link href={`/admin/shipping/new?customerId=${customer.id}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5">
            <PackagePlus size={19} /> Crear envío para {customer.name.split(" ")[0]}
          </Link>
        </div>

        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#061b3a] via-[#0b3d7c] to-[#0878c9] p-5 text-white shadow-xl sm:p-7 lg:p-9">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/10 blur-2xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/20 sm:h-20 sm:w-20">
                <UserRound size={34} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-blue-200">{customerCode(customer)}</p>
                <h1 className="mt-1 truncate text-2xl font-black sm:text-4xl">{customer.name}</h1>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-blue-100">
                  <span className="inline-flex items-center gap-2"><Phone size={15} />{customer.phone}</span>
                  {customer.birth_date && <span className="inline-flex items-center gap-2"><CalendarDays size={15} />{customer.birth_date}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a href={`https://wa.me/${customer.normalized_phone}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg">
                <MessageCircle size={18} /> WhatsApp
              </a>
              <button type="button" onClick={() => setShowRecipientModal(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#061b3a] shadow-lg">
                <Plus size={18} /> Nuevo destinatario
              </button>
            </div>
          </div>
        </header>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Operaciones" value={String(customer.operations_count || 0)} icon={<Package size={18} />} />
          <Metric label="Destinatarios" value={String(recipients.length)} icon={<Contact size={18} />} accent />
          <Metric label="Facturado" value={money(customer.total_billed)} icon={<WalletCards size={18} />} />
          <Metric label="Saldo pendiente" value={money(customer.total_balance)} icon={<WalletCards size={18} />} alert={Number(customer.total_balance || 0) > 0} />
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_1.12fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.14em] text-blue-700">Libreta del cliente</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">{recipients.length} destinatarios</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Selecciona uno para comenzar un envío con sus datos cargados.</p>
              </div>
              <button type="button" onClick={() => setShowRecipientModal(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm font-black text-blue-800">
                <Plus size={17} /> Agregar
              </button>
            </div>

            {recipients.length > 4 && (
              <label className="relative mt-5 block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={recipientSearch} onChange={(event) => setRecipientSearch(event.target.value)} placeholder="Buscar destinatario por nombre, teléfono o dirección..." className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" />
              </label>
            )}

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {filteredRecipients.map((recipient) => (
                <article key={recipient.id} className="group rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-white hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700"><Contact size={19} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate font-black text-slate-950">
                        {recipient.name}
                        {recipient.is_favorite && <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" />}
                      </p>
                      <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-500"><Phone size={14} />{recipient.phone}</p>
                      <p className="mt-1 flex items-start gap-2 text-sm font-medium text-slate-500"><MapPin size={14} className="mt-0.5 shrink-0" /><span className="line-clamp-2">{recipient.address}</span></p>
                    </div>
                  </div>
                  <Link href={`/admin/shipping/new?customerId=${customer.id}&recipientId=${recipient.id}`} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#061b3a] px-4 py-3 text-sm font-black text-white transition hover:bg-blue-900">
                    <PackagePlus size={17} /> Crear envío a este destinatario
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[.14em] text-emerald-700">Historial operativo</p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Envíos recientes</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Consulta rápidamente las últimas operaciones de este cliente.</p>
            </div>

            <div className="mt-5 space-y-3">
              {shipments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <Package className="mx-auto text-slate-300" size={34} />
                  <p className="mt-3 font-black text-slate-700">Todavía no hay envíos</p>
                </div>
              ) : shipments.map((shipment) => (
                <Link key={shipment.id} href={`/admin/shipping/${shipment.id}/edit`} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:shadow-sm">
                  <div className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-violet-100 px-2 font-black text-violet-700">{shipment.order_number || "—"}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-slate-950">{shipment.recipient_name || "Sin destinatario"}</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-500">{shipment.location || "Sin lugar"} · {shipment.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-950">{money(shipment.service_price)}</p>
                    <p className="mt-1 text-xs font-bold text-amber-700">Saldo {money(shipment.balance_due)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>

      {showRecipientModal && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] bg-white shadow-2xl sm:max-w-3xl sm:rounded-[2rem]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 p-5 backdrop-blur sm:p-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[.14em] text-blue-700">{customerCode(customer)}</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">Nuevo destinatario</h3>
              </div>
              <button type="button" onClick={() => setShowRecipientModal(false)} className="rounded-xl bg-slate-100 p-3 text-slate-600"><X size={20} /></button>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
              <Field label="Nombre completo" value={recipientForm.name} onChange={(value) => setRecipientForm((current) => ({ ...current, name: value }))} />
              <Field label="Teléfono" value={recipientForm.phone} onChange={(value) => setRecipientForm((current) => ({ ...current, phone: value.replace(/\D/g, "").slice(0, 15) }))} inputMode="numeric" />
              <Field label="Relación" value={recipientForm.relationship} onChange={(value) => setRecipientForm((current) => ({ ...current, relationship: value }))} placeholder="Ej. Madre, hermano, amigo" />
              <Field label="Carnet de identidad" value={recipientForm.identity_card} onChange={(value) => setRecipientForm((current) => ({ ...current, identity_card: value }))} />
              <Select label="País" value={recipientForm.country_id} onChange={(value) => setRecipientForm((current) => ({ ...current, country_id: value, province_id: "", municipality_id: "", shipping_location_id: "" }))} options={countries.filter((item) => item.is_active).map((item) => [item.id, item.name])} />
              <Select label="Provincia" value={recipientForm.province_id} onChange={(value) => setRecipientForm((current) => ({ ...current, province_id: value, municipality_id: "", shipping_location_id: "" }))} options={visibleProvinces.filter((item) => item.is_active).map((item) => [item.id, item.name])} />
              <Select label="Municipio" value={recipientForm.municipality_id} onChange={(value) => setRecipientForm((current) => ({ ...current, municipality_id: value, shipping_location_id: "" }))} options={visibleMunicipalities.filter((item) => item.is_active).map((item) => [item.id, item.name])} />
              <Select label="Lugar" value={recipientForm.shipping_location_id} onChange={(value) => setRecipientForm((current) => ({ ...current, shipping_location_id: value }))} options={visibleLocations.filter((item) => item.is_active).map((item) => [item.id, item.name])} />
              <div className="sm:col-span-2"><Field label="Dirección completa" value={recipientForm.address} onChange={(value) => setRecipientForm((current) => ({ ...current, address: value }))} /></div>
              <label className="sm:col-span-2"><span className="mb-2 block text-sm font-black text-slate-700">Notas</span><textarea value={recipientForm.notes} onChange={(event) => setRecipientForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>
            </div>

            {message && <div className="mx-5 mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 sm:mx-6">{message}</div>}

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 p-5 backdrop-blur sm:flex-row sm:justify-end sm:p-6">
              <button type="button" onClick={() => setShowRecipientModal(false)} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700">Cancelar</button>
              <button type="button" onClick={() => void createRecipient()} disabled={savingRecipient} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#061b3a] px-6 py-3 text-sm font-black text-white disabled:opacity-50">
                {savingRecipient ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Guardar destinatario
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Metric({ label, value, icon, alert = false, accent = false }: { label: string; value: string; icon: React.ReactNode; alert?: boolean; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 shadow-sm sm:rounded-3xl sm:p-5 ${accent ? "border-blue-100 bg-blue-50" : "border-slate-200 bg-white"}`}><div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">{icon}{label}</div><p className={`mt-2 truncate text-xl font-black sm:text-2xl ${alert ? "text-amber-700" : accent ? "text-blue-800" : "text-slate-950"}`}>{value}</p></div>;
}

function Field({ label, value, onChange, placeholder = "", inputMode }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return <label><span className="mb-2 block text-sm font-black text-slate-700">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100" /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label><span className="mb-2 block text-sm font-black text-slate-700">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-400 focus:bg-white"><option value="">Seleccionar</option>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}
