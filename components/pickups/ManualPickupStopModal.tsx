"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, MapPin, Plus, Search, UserRound, X } from "lucide-react";
import { createManualPickupRequest, getPickupServiceSettings, updateManualPickupRequest } from "@/lib/services/pickups";
import { getCityOptions } from "@/lib/geo/location-catalog";
import CityAutocomplete from "@/components/pickups/CityAutocomplete";
import LocationPickerMap from "@/components/maps/LocationPickerMap";
import type { PickupRequest } from "@/lib/pickups/types";
import { supabase } from "@/lib/supabase";

type Props = {
  open: boolean;
  storeId: string;
  routeId?: string | null;
  routeDate: string;
  editRequest?: PickupRequest | null;
  onClose: () => void;
  onCreated: (request: PickupRequest) => void | Promise<void>;
};

type PickupCustomer = {
  id: string; name: string; phone: string; email: string | null; address_line_1: string | null; address_line_2: string | null; city: string | null; region: string | null; postal_code: string | null; pickups_count: number; last_pickup_at: string | null;
};

const emptyForm = {
  customer_name: "",
  phone: "",
  email: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  region: "SC",
  postal_code: "",
  pickup_kind: "",
  pickup_detail: "",
  notes: "",
  formatted_address: "", place_id: "", latitude: null as number | null, longitude: null as number | null, address_verified: false,
};

export default function ManualPickupStopModal({ open, storeId, routeId, routeDate, editRequest = null, onClose, onCreated }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [customerMatches, setCustomerMatches] = useState<PickupCustomer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const pickupKind = editRequest ? pickupKindFromRequest(editRequest) : "";
    const pickupDetail = editRequest?.internal_notes?.match(/Recogida indicada:\s*(.+)$/i)?.[1] || "";
    setForm(editRequest ? {
      customer_name: editRequest.customer_name || "",
      phone: editRequest.phone || "",
      email: editRequest.email || "",
      address_line_1: editRequest.address_line_1 || "",
      address_line_2: editRequest.address_line_2 || "",
      city: editRequest.city || "",
      region: editRequest.region || "SC",
      postal_code: editRequest.postal_code || "",
      pickup_kind: pickupKind,
      pickup_detail: pickupDetail,
      notes: editRequest.notes || "",
      formatted_address: editRequest.formatted_address || "", place_id: editRequest.place_id || "", latitude: editRequest.latitude, longitude: editRequest.longitude, address_verified: Boolean(editRequest.address_verified),
    } : emptyForm);
    setError("");
    setCustomerMatches([]);
    setSelectedCustomerId(editRequest ? "editing" : null);
    setCitiesLoading(true);
    getPickupServiceSettings(storeId).then(({ data }) => {
      const countryCode = data?.country_code || "US";
      const regionCode = data?.region_code || "SC";
      const configured = Array.isArray(data?.allowed_cities) ? data.allowed_cities.filter(Boolean) : [];
      const allRegion = getCityOptions(countryCode, regionCode).map((item) => item.label);
      setCities(data?.coverage_mode === "cities" && configured.length ? configured : allRegion);
      setForm((current) => ({ ...current, region: regionCode }));
    }).finally(() => setCitiesLoading(false));
  }, [open, storeId, editRequest]);

  useEffect(() => {
    if (!open || selectedCustomerId) return;
    const query = form.phone.replace(/\D/g, "").length >= 3 ? form.phone : form.customer_name.trim().length >= 3 ? form.customer_name : "";
    if (!query) { setCustomerMatches([]); return; }
    const timer = window.setTimeout(async () => {
      setCustomerSearching(true);
      const { data } = await supabase.auth.getSession();
      const response = await fetch(`/api/admin/pickups/customers?store_id=${encodeURIComponent(storeId)}&q=${encodeURIComponent(query)}`, { headers: { Authorization: `Bearer ${data.session?.access_token || ""}` }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      setCustomerMatches(response.ok ? payload.customers || [] : []);
      setCustomerSearching(false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.customer_name, form.phone, open, selectedCustomerId, storeId]);

  function useCustomer(customer: PickupCustomer) {
    setSelectedCustomerId(customer.id);
    setCustomerMatches([]);
    setForm((current) => ({ ...current, customer_name: customer.name || "", phone: customer.phone || "", email: customer.email || "", address_line_1: customer.address_line_1 || "", address_line_2: customer.address_line_2 || "", city: customer.city || "", region: customer.region || "SC", postal_code: customer.postal_code || "" }));
  }

  if (!open) return null;


  async function save() {
    if (!form.customer_name.trim() || !form.phone.trim() || !form.address_line_1.trim() || !form.city.trim() || !form.postal_code.trim()) {
      return setError("Completa nombre, teléfono, dirección, ciudad y ZIP Code.");
    }
    setSaving(true);
    setError("");
    const payload = {
      storeId,
      routeId: routeId || null,
      preferredDate: routeDate,
      customerName: form.customer_name,
      phone: form.phone,
      email: form.email,
      addressLine1: form.address_line_1,
      addressLine2: form.address_line_2,
      city: form.city,
      region: form.region || "SC",
      postalCode: form.postal_code,
      pickupKind: form.pickup_kind || null,
      pickupDetail: form.pickup_detail,
      notes: form.notes,
      formattedAddress: form.formatted_address, placeId: form.place_id, latitude: form.latitude, longitude: form.longitude, addressVerified: form.address_verified,
    };
    const result = editRequest
      ? await updateManualPickupRequest(editRequest.id, payload)
      : await createManualPickupRequest(payload);
    setSaving(false);
    if (result.error || !result.data) return setError(result.error?.message || "No se pudo agregar la parada.");
    await onCreated(result.data);
    onClose();
  }

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white p-5 sm:p-6">
        <div><p className="text-xs font-black uppercase tracking-[.15em] text-orange-600">WhatsApp o llamada</p><h2 className="mt-1 text-2xl font-black">{editRequest ? "Editar parada manual" : "Agregar parada manual"}</h2><p className="mt-1 text-sm font-bold text-slate-500">{editRequest ? "Corrige los datos de esta parada." : `Se programará para ${routeDate}. No crea un envío.`}</p></div>
        <button onClick={onClose} disabled={saving} className="rounded-xl border p-2 text-slate-500"><X size={20} /></button>
      </header>
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Nombre del cliente *"><input className="manual-input" value={form.customer_name} onChange={(e) => { setSelectedCustomerId(null); setForm({ ...form, customer_name: e.target.value }); }} placeholder="Ej. Carlos García" /></Field>
        <Field label="Teléfono *"><input className="manual-input" inputMode="tel" value={form.phone} onChange={(e) => { setSelectedCustomerId(null); setForm({ ...form, phone: e.target.value }); }} placeholder="(864) 555-0000" /></Field>
        {(customerSearching || customerMatches.length > 0 || selectedCustomerId) && <div className="sm:col-span-2">
          {selectedCustomerId ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-800"><Check size={18} /> Cliente existente cargado. Puedes actualizar cualquier dato antes de guardar.</div> : <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-black text-blue-900">{customerSearching ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />} Clientes encontrados</p>
            <div className="space-y-2">{customerMatches.map((customer) => <button key={customer.id} type="button" onClick={() => useCustomer(customer)} className="flex w-full items-center justify-between rounded-xl bg-white p-3 text-left shadow-sm hover:ring-2 hover:ring-blue-200"><span className="flex items-center gap-3"><UserRound size={18} className="text-blue-600" /><span><b className="block text-slate-900">{customer.name}</b><small className="font-bold text-slate-500">{customer.phone} · {customer.city || "Sin ciudad"}</small></span></span><span className="text-xs font-black text-blue-700">{customer.pickups_count || 0} recogidas</span></button>)}</div>
          </div>}
        </div>}
        <Field label="Email"><input className="manual-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Opcional" /></Field>
        <div className="sm:col-span-2">
          <Field label="¿Qué recogeremos? (opcional)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["one_box", "Caja"],
                ["two_boxes", "2 cajas"],
                ["three_plus_boxes", "3+ cajas"],
                ["documents", "Documentos"],
                ["luggage", "Equipaje"],
                ["other", "Otro"],
              ].map(([value, label]) => {
                const active = form.pickup_kind === value;
                return <button key={value} type="button" onClick={() => setForm({ ...form, pickup_kind: active ? "" : value, pickup_detail: value === "other" ? form.pickup_detail : "" })} className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${active ? "border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-100" : "border-slate-200 bg-white text-slate-700 hover:border-orange-300"}`}>{label}</button>;
              })}
            </div>
          </Field>
          {form.pickup_kind === "other" && <div className="mt-3"><Field label="Describe qué recogeremos (opcional)"><input className="manual-input" value={form.pickup_detail} onChange={(e) => setForm({ ...form, pickup_detail: e.target.value })} placeholder="Ej. Televisor y una bolsa" /></Field></div>}
        </div>
        <div className="sm:col-span-2"><Field label="Dirección *"><div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className="manual-input pl-11" value={form.address_line_1} onChange={(e) => setForm({ ...form, address_line_1: e.target.value, formatted_address: "", address_verified: false })} placeholder="Número y calle" /></div></Field></div>
        <div className="sm:col-span-2"><Field label="Ubicación en el mapa (opcional, recomendada)"><LocationPickerMap latitude={form.latitude} longitude={form.longitude} onChange={(latitude, longitude) => setForm((current) => ({ ...current, latitude, longitude, address_verified: true, place_id: "", formatted_address: [current.address_line_1, current.city, current.region, current.postal_code].filter(Boolean).join(", ") }))} onClear={() => setForm((current) => ({ ...current, latitude: null, longitude: null, address_verified: false }))}/></Field></div>
        <div className="sm:col-span-2"><Field label="Apartamento, unidad o referencia"><input className="manual-input" value={form.address_line_2} onChange={(e) => setForm({ ...form, address_line_2: e.target.value })} placeholder="Opcional" /></Field></div>
        <div><CityAutocomplete cities={cities} value={form.city} onChange={(city) => setForm({ ...form, city })} loading={citiesLoading} disabled={citiesLoading || !cities.length} placeholder="Ej. Columbia" /></div>
        <div className="grid grid-cols-[110px_1fr] gap-3"><Field label="Estado"><input className="manual-input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value.toUpperCase().slice(0, 2) })} /></Field><Field label="ZIP Code *"><input className="manual-input" inputMode="numeric" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><Field label="Notas"><textarea className="manual-input min-h-28 resize-y" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej. Escribir al llegar, tiene dos cajas..." /></Field></div>
        {error && <p className="sm:col-span-2 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">{error}</p>}
      </div>
      <footer className="sticky bottom-0 flex justify-end gap-3 border-t bg-slate-50 p-5 sm:p-6"><button onClick={onClose} disabled={saving} className="rounded-2xl border bg-white px-5 py-3 font-black">Cancelar</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-black text-white disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} {editRequest ? "Guardar cambios" : "Agregar parada"}</button></footer>
      <style jsx>{`.manual-input{width:100%;border:1px solid #dbe3ee;border-radius:1rem;padding:.82rem 1rem;font-weight:700;outline:none;background:white}.manual-input:focus{border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.12)}`}</style>
    </div>
  </div>;
}

function pickupKindFromRequest(request: PickupRequest) {
  if (request.package_type === "box" && request.package_count === 1) return "one_box";
  if (request.package_type === "box" && request.package_count === 2) return "two_boxes";
  if (request.package_type === "box_3_plus" || (request.package_type === "box" && request.package_count >= 3)) return "three_plus_boxes";
  if (request.package_type === "documents") return "documents";
  if (request.package_type === "luggage") return "luggage";
  if (request.package_type === "other") return "other";
  return "";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">{label}</span>{children}</label>;
}
