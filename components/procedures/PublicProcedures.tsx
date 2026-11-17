"use client";
import { getContrastTextColor, normalizeHex } from "@/lib/admin/theme";
import Image from "next/image";
import { usePublicProcedures } from "./usePublicProcedures";
const field = "mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3 text-slate-900";
export default function PublicProcedures({ name, color }: { name: string; color?: string | null }) {
  const { catalog, loading, catalogUnavailable, setService, variant, setVariant, result, setResult, error, setError, busy, entry, option, submit } = usePublicProcedures();
  const brand = { backgroundColor: normalizeHex(color), color: getContrastTextColor(color) };
  return <section style={{ fontFamily: "var(--font-manrope, Arial, sans-serif)" }} id="tramites" className="bg-slate-50 px-4 py-16 text-slate-900"><div className="mx-auto max-w-6xl">
    <h2 className="text-3xl font-bold">Gestión de trámites</h2><p className="mt-3 text-slate-600">Solicita y gestiona tus servicios con {name}.</p>
    {loading && <p role="status">Cargando trámites…</p>}
    {catalogUnavailable && <p role="alert">No pudimos cargar los servicios. Inténtalo de nuevo.</p>}
    {!loading && !catalogUnavailable && !catalog.length && <p>No hay servicios publicados.</p>}
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{catalog.map(item => <article key={item.service} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      {item.configuration.image && <Image src={item.configuration.image} alt={item.configuration.title} width={500} height={280} unoptimized className="mb-4 h-40 w-full rounded-lg object-cover" />}
      <h3 className="text-xl font-semibold">{item.configuration.title}</h3><p className="my-3 text-sm text-slate-600">{item.configuration.description}</p>
      {item.configuration.agencyFee !== null && <p>Gestión: ${item.configuration.agencyFee.toFixed(2)} USD</p>}
      {!!item.configuration.fees.length && <details className="mt-3 text-sm"><summary>Tarifas</summary>{item.configuration.fees.map((fee, index) => <p key={index}>{fee.label}: ${fee.amount.toFixed(2)} USD {fee.unit}</p>)}</details>}
      <details className="my-3 text-sm"><summary>Requisitos</summary>{item.configuration.variants.map(variant => <div key={variant.id}><strong>{variant.title}</strong><ul className="list-inside list-disc">{variant.requirements.map(requirement => <li key={requirement.id}>{requirement.label}{requirement.optional && " (opcional)"}</li>)}</ul></div>)}</details>
      <button style={brand} className="mt-4 rounded-lg bg-slate-900 px-4 py-3 text-white" onClick={() => { setService(item.service); setVariant(item.configuration.variants[0].id); setResult(""); setError(""); requestAnimationFrame(() => document.getElementById("public-procedure-form")?.focus()); }}>Solicitar trámite</button>
    </article>)}</div>
    {entry && option && <div id="public-procedure-form" tabIndex={-1} className="mx-auto mt-8 max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 text-xl font-bold">{entry.configuration.title}</h3>
      {result ? <p role="status" className="break-all">Solicitud recibida. Guarda tu referencia: <strong>{result}</strong></p> : <form onSubmit={submit} className="grid gap-4">
        <label>Variante<select className={field} value={variant} onChange={event => setVariant(event.target.value)} disabled={busy}>{entry.configuration.variants.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
        <fieldset disabled={busy} className="grid gap-4"><legend className="font-semibold">Datos del solicitante</legend>
          <label>Nombre<input className={field} name="name" required maxLength={120} autoComplete="name" /></label>
          <label>Teléfono<input className={field} name="phone" type="tel" required maxLength={30} autoComplete="tel" /></label>
          <label>Correo<input className={field} name="email" type="email" required={entry.configuration.emailRequired !== false} maxLength={254} autoComplete="email" /></label>
        </fieldset>
        <fieldset key={`${entry.service}:${variant}`} disabled={busy} className="grid gap-4"><legend className="font-semibold">Requisitos</legend>{option.requirements.map(item => <label key={item.id}>{item.label}<select className={field} name={`requirement-${item.id}`} required defaultValue=""><option value="" disabled>Selecciona</option><option value="ready">Lo tengo listo</option><option value="missing">Me falta</option>{item.optional && <option value="na">No aplica</option>}</select></label>)}</fieldset>
        <label><input name="whatsapp" type="checkbox" disabled={busy} /> Acepto que {name} me contacte por WhatsApp sobre esta solicitud.</label>
        <p className="text-xs text-slate-500">Usaremos tus datos para gestionar la solicitud. Los datos de contacto se retiran a los 90 días del cierre.</p>
        {error && <p role="alert" className="text-red-700">{error}</p>}
        <button style={brand} className="rounded-lg bg-slate-900 p-3 text-white disabled:opacity-50" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitud"}</button>
      </form>}
    </div>}
  </div></section>;
}
