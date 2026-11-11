"use client";

import type { Configuration } from "@/lib/procedures/catalog";

const input = "block w-full rounded border border-slate-300 bg-white px-3 py-2";

export default function CatalogEditor({ value, change }: { value: Configuration; change: (value: Configuration) => void }) {
  function updateVariant(index: number, variant: Configuration["variants"][number]) {
    change({ ...value, variants: value.variants.map((item, i) => i === index ? variant : item) });
  }
  return <div className="grid gap-4">
    <label>Título <input className={input} required maxLength={240} value={value.title}
      onChange={event => change({ ...value, title: event.target.value })} /></label>
    <label>Descripción y plazos <textarea className={input} required maxLength={2000} rows={3} value={value.description}
      onChange={event => change({ ...value, description: event.target.value })} /></label>
    <label>Honorarios de WF Cargo en USD <input className={input} type="number" min="0" max="100000" step="0.01" value={value.agencyFee ?? ""}
      onChange={event => change({ ...value, agencyFee: event.target.value ? Number(event.target.value) : null })} /></label>
    <fieldset className="grid gap-2 rounded border p-3">
      <legend>Tarifas de terceros</legend>
      {value.fees.map((fee, index) => {
        const setFee = (next: typeof fee) => change({ ...value, fees: value.fees.map((item, i) => i === index ? next : item) });
        return <div className="grid items-end gap-2 sm:grid-cols-4" key={index}>
          <label>Concepto <input className={input} required value={fee.label} onChange={event => setFee({ ...fee, label: event.target.value })} /></label>
          <label>Importe USD <input className={input} type="number" min="0" max="100000" step="0.01" required value={fee.amount} onChange={event => setFee({ ...fee, amount: Number(event.target.value) })} /></label>
          <label>Unidad <input className={input} required value={fee.unit} onChange={event => setFee({ ...fee, unit: event.target.value })} /></label>
          <button className="justify-self-start underline" type="button" onClick={() => change({ ...value, fees: value.fees.filter((_, i) => i !== index) })}>Quitar tarifa</button>
        </div>;
      })}
      <button className="justify-self-start underline" type="button" disabled={value.fees.length >= 20}
        onClick={() => change({ ...value, fees: [...value.fees, { label: "", amount: 0, unit: "por trámite" }] })}>Agregar tarifa</button>
    </fieldset>
    {value.variants.map((variant, index) => <fieldset className="grid gap-2 rounded border p-3" key={variant.id}>
      <legend>Variante {index + 1}</legend>
      <label>Nombre <input className={input} required maxLength={240} value={variant.title}
        onChange={event => updateVariant(index, { ...variant, title: event.target.value })} /></label>
      {variant.requirements.map((item, position) => <div className="grid items-end gap-2 md:grid-cols-[2fr_1fr_auto]" key={item.id}>
        <label>Requisito <input className={input} required maxLength={240} value={item.label}
          onChange={event => updateVariant(index, { ...variant, requirements: variant.requirements.map((row, i) =>
            i === position ? { ...row, label: event.target.value } : row) })} /></label>
        <label className="py-2"><input type="checkbox" checked={item.optional}
          onChange={event => updateVariant(index, { ...variant, requirements: variant.requirements.map((row, i) =>
            i === position ? { ...row, optional: event.target.checked } : row) })} /> Admite «No aplica»</label>
        <button className="justify-self-start underline" type="button" disabled={variant.requirements.length === 1}
          onClick={() => updateVariant(index, { ...variant, requirements: variant.requirements.filter((_, i) => i !== position) })}>Quitar requisito</button>
      </div>)}
      <button className="justify-self-start underline" type="button" disabled={variant.requirements.length >= 30}
        onClick={() => updateVariant(index, { ...variant, requirements: [...variant.requirements,
          { id: crypto.randomUUID(), label: "", optional: false }] })}>Agregar requisito</button>
      <button className="justify-self-start underline" type="button" disabled={value.variants.length === 1}
        onClick={() => change({ ...value, variants: value.variants.filter((_, i) => i !== index) })}>Quitar variante</button>
    </fieldset>)}
    <button className="justify-self-start underline" type="button" disabled={value.variants.length >= 12}
      onClick={() => change({ ...value, variants: [...value.variants, { id: crypto.randomUUID(), title: "",
        requirements: [{ id: crypto.randomUUID(), label: "", optional: false }] }] })}>Agregar variante</button>
  </div>;
}
