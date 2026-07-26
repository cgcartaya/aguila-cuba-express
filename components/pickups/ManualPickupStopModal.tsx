"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Plus, X } from "lucide-react";
import { createManualPickupRequest } from "@/lib/services/pickups";
import type { PickupRequest } from "@/lib/pickups/types";

type Props = {
  open: boolean;
  storeId: string;
  routeId?: string | null;
  routeDate: string;
  onClose: () => void;
  onCreated: (request: PickupRequest) => void | Promise<void>;
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
  package_count: "1",
  notes: "",
};

export default function ManualPickupStopModal({ open, storeId, routeId, routeDate, onClose, onCreated }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setError("");
  }, [open]);

  if (!open) return null;

  async function save() {
    if (!form.customer_name.trim() || !form.phone.trim() || !form.address_line_1.trim() || !form.city.trim() || !form.postal_code.trim()) {
      return setError("Completa nombre, teléfono, dirección, ciudad y ZIP Code.");
    }
    setSaving(true);
    setError("");
    const result = await createManualPickupRequest({
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
      packageCount: Number(form.package_count) || 1,
      notes: form.notes,
    });
    setSaving(false);
    if (result.error || !result.data) return setError(result.error?.message || "No se pudo agregar la parada.");
    await onCreated(result.data);
    onClose();
  }

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white p-5 sm:p-6">
        <div><p className="text-xs font-black uppercase tracking-[.15em] text-orange-600">WhatsApp o llamada</p><h2 className="mt-1 text-2xl font-black">Agregar parada manual</h2><p className="mt-1 text-sm font-bold text-slate-500">Se programará para {routeDate}. No crea un envío.</p></div>
        <button onClick={onClose} disabled={saving} className="rounded-xl border p-2 text-slate-500"><X size={20} /></button>
      </header>
      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field label="Nombre del cliente *"><input className="manual-input" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Ej. Carlos García" /></Field>
        <Field label="Teléfono *"><input className="manual-input" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(864) 555-0000" /></Field>
        <Field label="Email"><input className="manual-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Opcional" /></Field>
        <Field label="Cantidad estimada"><input className="manual-input" type="number" min="1" max="99" value={form.package_count} onChange={(e) => setForm({ ...form, package_count: e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Dirección *"><div className="relative"><MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input className="manual-input pl-11" value={form.address_line_1} onChange={(e) => setForm({ ...form, address_line_1: e.target.value })} placeholder="Número y calle" /></div></Field></div>
        <div className="sm:col-span-2"><Field label="Apartamento, unidad o referencia"><input className="manual-input" value={form.address_line_2} onChange={(e) => setForm({ ...form, address_line_2: e.target.value })} placeholder="Opcional" /></Field></div>
        <Field label="Ciudad *"><input className="manual-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ej. Greenville" /></Field>
        <div className="grid grid-cols-[110px_1fr] gap-3"><Field label="Estado"><input className="manual-input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value.toUpperCase().slice(0, 2) })} /></Field><Field label="ZIP Code *"><input className="manual-input" inputMode="numeric" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></Field></div>
        <div className="sm:col-span-2"><Field label="Notas"><textarea className="manual-input min-h-28 resize-y" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ej. Escribir al llegar, tiene dos cajas..." /></Field></div>
        {error && <p className="sm:col-span-2 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700">{error}</p>}
      </div>
      <footer className="sticky bottom-0 flex justify-end gap-3 border-t bg-slate-50 p-5 sm:p-6"><button onClick={onClose} disabled={saving} className="rounded-2xl border bg-white px-5 py-3 font-black">Cancelar</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-black text-white disabled:opacity-50">{saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Agregar parada</button></footer>
      <style jsx>{`.manual-input{width:100%;border:1px solid #dbe3ee;border-radius:1rem;padding:.82rem 1rem;font-weight:700;outline:none;background:white}.manual-input:focus{border-color:#f97316;box-shadow:0 0 0 3px rgba(249,115,22,.12)}`}</style>
    </div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">{label}</span>{children}</label>;
}
