'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/lib/supabase';
import { entrySchema, shippingStatus, type ShippingEntry } from '@/lib/luxury/shipping';
import { LUXURY_SLUG } from '@/lib/travel/types';

const languages = { es: 'Español', en: 'Inglés', fr: 'Francés' } as const;
const fields = {
  title: 'Nombre', price: 'Tarifa y unidad de cobro', description: 'Descripción',
  terms: 'Condiciones', delivery: 'Plazo de entrega', button: 'Texto del botón de WhatsApp',
  message: 'Mensaje inicial de WhatsApp',
} as const;
const sections = {
  hero: 'Cajas doradas', rate: 'Tarifas generales', special: 'Servicios de envío',
  promotion: 'Promociones', online: 'Tienda online',
} as const;
const visibility = { active: 'Publicado', hidden: 'Oculto', scheduled: 'Programado', expired: 'Vencido', weekday: 'Fuera del día de publicación' };
const input = 'block w-full rounded border border-gray-300 px-2 py-1';
const blankCopy = { title: '', price: '', description: '', terms: '', delivery: '', button: '', message: '' };
const newEntry = (): ShippingEntry => ({
  key: crypto.randomUUID(), section: 'promotion', service_key: null, position: 0, enabled: false,
  visible: true, starts_on: null, ends_on: null, weekdays: [], external_url: '',
  copy: { es: { ...blankCopy }, en: { ...blankCopy }, fr: { ...blankCopy } },
});

export default function LuxuryShippingAdmin() {
  const access = useAdminAccess();
  const selection = useStore();
  const store = access.isSuperAdmin ? selection.store || access.store : access.store;
  if (access.loading || selection.loading) return <p>Cargando agencia…</p>;
  if (store?.slug !== LUXURY_SLUG) return <p>El catálogo comercial pertenece a Luxury Travel Point.</p>;
  return <CatalogEditor key={store.id} storeId={store.id}/>;
}

function CatalogEditor({ storeId }: { storeId: string }) {
  const [rows, setRows] = useState<ShippingEntry[]>([]);
  const [draft, setDraft] = useState<ShippingEntry>();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void supabase.from('luxury_shipping_catalog').select('*').eq('store_id', storeId)
      .order('position').order('key').abortSignal(controller.signal).then(({ data, error }) => {
        if (controller.signal.aborted) return;
        if (error) setStatus('No se pudo cargar el catálogo. Verifica la migración y tus permisos.');
        else setRows(data as ShippingEntry[]);
        setLoading(false);
      });
    return () => controller.abort();
  }, [storeId]);

  function change(patch: Partial<ShippingEntry>) {
    setDraft(previous => previous && { ...previous, ...patch });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = entrySchema.safeParse(draft);
    if (!parsed.success) {
      setStatus('Revisa los títulos en los tres idiomas, las fechas, las longitudes de texto y la URL HTTPS.');
      return;
    }
    const row = parsed.data;
    setSaving(true);
    setStatus('');
    try {
      const { key, section, ...editable } = row;
      const query = rows.some(item => item.key === key)
        ? supabase.from('luxury_shipping_catalog').update(editable).eq('store_id', storeId).eq('key', key)
        : supabase.from('luxury_shipping_catalog').insert({ key, section, ...editable, store_id: storeId });
      const { data, error } = await query.select().maybeSingle();
      if (error || !data) throw new Error('No se pudo guardar. Comprueba tus permisos y la configuración.');
      setRows(previous => [...previous.filter(item => item.key !== key), row].sort((a, b) => a.position - b.position || a.key.localeCompare(b.key)));
      setStatus('Cambios guardados.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="space-y-4">
    <h1 className="text-2xl font-bold">Tarifas y promociones de Luxury</h1>
    <p>Las fechas son inclusivas y se interpretan en la hora de Florida (America/New_York). Selecciona días de la semana para limitar la publicación.</p>
    {loading && <p>Cargando catálogo…</p>}
    {status && <p role="status">{status}</p>}
    <fieldset disabled={loading || saving} className="space-y-3">
      <button type="button" className="rounded bg-slate-900 px-4 py-2 text-white" onClick={() => { setDraft(newEntry()); setStatus(''); }}>Nueva promoción</button>
      <ul className="divide-y rounded border">
        {rows.map(row => <li key={row.key} className="p-2">
          <button type="button" className="text-left underline" onClick={() => { setDraft(row); setStatus(''); }}>{row.copy.es.title}</button>
          <span className="ml-2 text-sm">{sections[row.section]} · {visibility[shippingStatus(row)]}{row.ends_on && ` · Hasta ${row.ends_on}`}</span>
        </li>)}
      </ul>
    </fieldset>
    {draft && <form onSubmit={save} className="space-y-4 rounded border p-4">
      <fieldset disabled={saving} className="space-y-4">
        <legend className="font-semibold">{draft.copy.es.title || 'Nueva promoción'}</legend>
        <label className="mr-4"><input type="checkbox" checked={draft.enabled} onChange={event => change({ enabled: event.target.checked })}/> Activa</label>
        <label><input type="checkbox" checked={draft.visible} onChange={event => change({ visible: event.target.checked })}/> Visible</label>
        <label className="block">Orden de aparición<input className={input} required type="number" value={draft.position} onChange={event => change({ position: event.target.valueAsNumber })}/></label>
        {draft.section === 'promotion' && <>
          <label className="block">Servicio asociado<select className={input} value={draft.service_key ?? ''} onChange={event => change({ service_key: event.target.value || null })}>
            <option value="">General</option>
            {rows.filter(row => row.section !== 'promotion').map(row => <option key={row.key} value={row.key}>{row.copy.es.title}</option>)}
          </select></label>
          <label className="block">Inicio<input required type="date" className={input} value={draft.starts_on ?? ''} onChange={event => change({ starts_on: event.target.value || null })}/></label>
          <label className="block">Fin<input required type="date" className={input} min={draft.starts_on ?? undefined} value={draft.ends_on ?? ''} onChange={event => change({ ends_on: event.target.value || null })}/></label>
          <fieldset><legend>Días de publicación (ninguno seleccionado = todos)</legend>
            {['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((label, day) => <label key={label} className="mr-3 inline-block">
              <input type="checkbox" checked={draft.weekdays.includes(day)} onChange={event => change({ weekdays: event.target.checked ? [...draft.weekdays, day] : draft.weekdays.filter(value => value !== day) })}/> {label}
            </label>)}
          </fieldset>
        </>}
        {draft.section === 'online' && <label className="block">URL de la tienda<input type="url" className={input} placeholder="https://" value={draft.external_url} onChange={event => change({ external_url: event.target.value })}/></label>}
        <div className="grid gap-4 xl:grid-cols-3">
          {(Object.keys(languages) as Array<keyof typeof languages>).map(language => <fieldset key={language} className="space-y-2 rounded border p-3">
            <legend>{languages[language]}</legend>
            {(Object.keys(fields) as Array<keyof typeof fields>).map(field => <label className="block" key={field}>{fields[field]}
              <textarea className={input} rows={field === 'description' || field === 'terms' ? 3 : 1} required={field === 'title'} value={draft.copy[language][field]}
                onChange={event => change({ copy: { ...draft.copy, [language]: { ...draft.copy[language], [field]: event.target.value } } })}/>
            </label>)}
          </fieldset>)}
        </div>
        <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">{saving ? 'Guardando…' : 'Guardar'}</button>
      </fieldset>
    </form>}
  </section>;
}
