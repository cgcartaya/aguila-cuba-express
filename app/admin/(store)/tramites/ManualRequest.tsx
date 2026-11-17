"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { CatalogEntry } from "@/lib/procedures/catalog";
const field = "block w-full rounded-lg border border-slate-300 bg-white p-2";
export default function ManualRequest({ catalog, employees, supervisor, submit, close }: {
  catalog: CatalogEntry[]; employees: { user_id: string; profiles: { full_name: string } | null }[];
  supervisor: boolean; submit: (body: object) => Promise<boolean>; close: () => void;
}) {
  const [service, setService] = useState(catalog[0]?.service || "");
  const entry = catalog.find(item => item.service === service);
  const [variant, setVariant] = useState(entry?.configuration.variants[0]?.id || "");
  const option = entry?.configuration.variants.find(item => item.id === variant);
  const [busy, setBusy] = useState(false);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex justify-between gap-3"><h2 className="text-lg font-bold">Nueva solicitud</h2><button onClick={close}>Cerrar</button></div>
    {!entry || !option ? <p>Crea un trámite activo en Configuración para registrar solicitudes.</p> : <form className="grid gap-4 sm:grid-cols-2" onSubmit={async event => {
      event.preventDefault(); if (busy) return; setBusy(true);
      try {
        const values = new FormData(event.currentTarget);
        const { data } = await supabase.auth.getSession();
        await submit({ action: "create", service, variant, version: entry.version, name: values.get("name"), phone: values.get("phone"), email: values.get("email"),
          whatsapp: values.has("whatsapp"), origin: values.get("origin"), employee: supervisor ? values.get("employee") || null : data.session?.user.id,
          note: values.get("note"), checklist: Object.fromEntries(option.requirements.map(item => [item.id, values.get(`requirement-${item.id}`)])) });
      } finally { setBusy(false); }
    }}>
      <label>Trámite<select className={field} value={service} onChange={event => { setService(event.target.value); setVariant(catalog.find(item => item.service === event.target.value)?.configuration.variants[0].id || ""); }}>
        {catalog.map(item => <option key={item.service} value={item.service}>{item.configuration.title}</option>)}</select></label>
      <label>Variante<select className={field} value={variant} onChange={event => setVariant(event.target.value)}>{entry.configuration.variants.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
      <label>Nombre<input className={field} required maxLength={120} name="name" /></label>
      <label>Teléfono<input className={field} required maxLength={30} name="phone" type="tel" /></label>
      <label>Correo<input className={field} required={entry.configuration.emailRequired !== false} maxLength={254} name="email" type="email" /></label>
      <label>Origen<select className={field} name="origin"><option value="presencial">Presencial</option><option value="telefono">Teléfono</option><option value="whatsapp">WhatsApp</option></select></label>
      {supervisor && <label>Responsable<select className={field} name="employee"><option value="">Sin asignar</option>{employees.map(item => <option key={item.user_id} value={item.user_id}>{item.profiles?.full_name || item.user_id}</option>)}</select></label>}
      <label className="sm:col-span-2">Observaciones internas<textarea className={field} name="note" maxLength={2000} /></label>
      <fieldset key={`${service}:${variant}`} className="grid gap-3 sm:col-span-2"><legend className="mb-2 font-semibold">Requisitos</legend>{option.requirements.map(item => <label key={item.id}>{item.label}<select className={field} name={`requirement-${item.id}`} required defaultValue=""><option value="" disabled>Selecciona</option><option value="ready">Recibido</option><option value="missing">Pendiente</option>{item.optional && <option value="na">No aplica</option>}</select></label>)}</fieldset>
      <label><input name="whatsapp" type="checkbox" /> Cliente acepta contacto por WhatsApp</label>
      <button disabled={busy} className="rounded-lg bg-slate-900 p-3 text-white disabled:opacity-50">{busy ? "Guardando…" : "Guardar solicitud"}</button>
    </form>}
  </section>;
}
