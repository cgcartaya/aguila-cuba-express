"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ClipboardCheck, Clock3, Eye, Info, Loader2, MapPin, Plus, Save, Store, Trash2, Upload } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/lib/supabase';
import { optimizeImageFile } from '@/lib/images/optimizeImage';
import { emptyRestaurantSection, RESTAURANT_NOTICE, RESTAURANT_PATH, type RestaurantSection } from '@/lib/restaurant/section';

export default function RestaurantSettingsPage() {
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const store = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [isSuperAdmin, selectedStore, accessStore]);
  return <main className="min-h-screen bg-slate-50 min-w-0 p-4 pb-48 sm:p-6 sm:pb-48 lg:p-8 lg:pb-48">{accessLoading || storeLoading ? <p>Cargando tienda…</p> : store?.slug === 'aguila' ? <RestaurantForm key={store.id} storeId={store.id} /> : <p>Esta sección está preparada para Águila Express.</p>}</main>;
}
function RestaurantForm({ storeId }: { storeId: string }) {
  const [config, setConfig] = useState<RestaurantSection>(emptyRestaurantSection);
  const [version, setVersion] = useState<string | null>(null);
  const [currencyLocked, setCurrencyLocked] = useState(false);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [uploading, setUploading] = useState(false);
  const [error, setError] = useState(''), [success, setSuccess] = useState('');
  async function request(method = 'GET', body?: unknown) {
    const { data } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/restaurant-section?store_id=${encodeURIComponent(storeId)}`, { method, headers: { Authorization: `Bearer ${data.session?.access_token || ''}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
    const result = await res.json(); if (!res.ok) throw Error(result.error || 'No se pudo completar la operación.'); return result;
  }
  useEffect(() => {
    let active = true;
    void request().then(data => { if (active) { setConfig(data.config); setVersion(data.updated_at); setCurrencyLocked(data.currency_locked === true); } }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try { const data = await request('PUT', { config, updated_at: version }); setConfig(data.config); setVersion(data.updated_at); setCurrencyLocked(data.currency_locked === true); setSuccess('Configuración guardada.'); }
    catch (error) { setError(error instanceof Error ? error.message : 'No se pudo guardar.'); }
    finally { setSaving(false); }
  }
  async function upload(file?: File) {
    if (!file) return; setUploading(true); setError('');
    try {
      const optimized = await optimizeImageFile(file, 'product');
      const path = `restaurant/${storeId}/${crypto.randomUUID()}.${optimized.name.split('.').pop() || 'webp'}`;
      const { error } = await supabase.storage.from('product-images').upload(path, optimized, { upsert: false, contentType: optimized.type, cacheControl: '31536000' });
      if (error) throw error;
      const { data } = supabase.storage.from('product-images').getPublicUrl(path); setConfig(prev => ({ ...prev, logo_url: data.publicUrl }));
    } catch { setError('No se pudo subir el logo. Intenta de nuevo.'); } finally { setUploading(false); }
  }
  const input = 'mt-2 min-h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';
  const card = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6';
  const colorPicker = (label:string, key:'accent'|'secondary_color'|'background_color', help:string) => <label className="block text-sm font-bold">{label}<span className="mt-2 flex items-center gap-3"><input aria-label={label} type="color" value={config[key]} onChange={e=>setConfig({...config,[key]:e.target.value})} className="h-12 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"/><span><span className="block text-xs font-bold text-slate-700">{config[key].toUpperCase()}</span><span className="mt-0.5 block text-[11px] font-normal text-slate-500">{help}</span></span></span></label>;
  return <div className="mx-auto max-w-7xl text-[#061b3a]">
    <p className="mb-5 text-xs font-semibold text-slate-500"><Link href="/admin" className="hover:underline">Administración</Link> <span aria-hidden="true"> / </span> Restaurante <span aria-hidden="true"> / </span> Configuración</p>
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">Tu restaurante, en un solo lugar</h1><p className="mt-2 text-sm leading-relaxed text-slate-500 sm:text-base">Gestiona su identidad, menú y entregas desde Águila.</p></div>
      {config.enabled && <Link href={RESTAURANT_PATH} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold"><Eye size={18}/>Vista previa</Link>}
    </header>
    {loading ? <p role="status" className={card}>Cargando configuración…</p> : <form onSubmit={save}>
      <fieldset disabled={saving || uploading || !version} className="min-w-0 space-y-5 disabled:opacity-70">
        <div className={`${card} flex flex-wrap items-center justify-between gap-4`}>
          <div><p className="flex items-center gap-2 text-sm font-black"><span className={`h-2.5 w-2.5 rounded-full ${config.enabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />{config.enabled ? 'Sección activada' : 'Sin publicar'}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Completa el nombre, los platos y las zonas antes de publicar. El cambio se aplica al guardar.</p></div>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold"><input aria-label="Publicar restaurante" type="checkbox" checked={config.enabled} onChange={e=>setConfig({...config,enabled:e.target.checked})} className="peer sr-only"/><span aria-hidden="true" className="relative h-7 w-12 rounded-full bg-slate-200 transition after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:bg-emerald-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2"/>Publicar restaurante</label>
        </div>
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
          <div className="min-w-0 space-y-5">
            <section className={card} aria-labelledby="identity-title">
              <div className="mb-6 flex items-start gap-3"><Store size={23} className="mt-0.5 shrink-0"/><div><h2 id="identity-title" className="text-lg font-black">Identidad del restaurante</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Esta información y los colores se aplican solo al restaurante, sin cambiar la identidad de la tienda Águila.</p></div></div>
              <div className="space-y-5">
                <label className="block text-sm font-bold">Nombre del restaurante<input aria-label="Nombre del restaurante" maxLength={100} placeholder="Nombre del restaurante" value={config.name} onChange={e=>setConfig({...config,name:e.target.value})} className={input}/></label>
                <label className="block text-sm font-bold">Descripción<textarea rows={3} maxLength={400} placeholder="Cuéntales qué pueden pedir" value={config.description} onChange={e=>setConfig({...config,description:e.target.value})} className={`${input} resize-y`}/><span className="mt-1 block text-right text-xs font-normal text-slate-400">{config.description.length}/400</span></label>
                <div className="grid min-w-0 gap-5 sm:grid-cols-2">
                  <div className="min-w-0"><p className="text-sm font-bold">Logo del restaurante</p><label className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm font-bold focus-within:ring-2 focus-within:ring-blue-500">
                    {config.logo_url ? <img src={config.logo_url} alt="Logo del restaurante" className="h-14 w-14 rounded-xl object-contain"/> : <Upload size={25}/>}{uploading ? 'Subiendo…' : 'Subir logo'}<span className="text-xs font-normal text-slate-500">PNG, JPG o WEBP</span><input aria-label="Subir logo del restaurante" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>void upload(e.target.files?.[0])}/></label>
                    <label className="mt-3 block text-xs font-semibold text-slate-500">O pega el enlace del logo<input aria-label="URL del logo" type="url" placeholder="https://…" value={config.logo_url} onChange={e=>setConfig({...config,logo_url:e.target.value})} className={input}/></label>
                  </div>
                  <div className="min-w-0 space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-black">Paleta del restaurante</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Controla botones y detalles, cabecera y fondo de toda la carta.</p><div className="mt-4 grid gap-4">{colorPicker('Color principal','accent','Botones, precios y detalles')}{colorPicker('Color secundario','secondary_color','Cabecera y zonas oscuras')}{colorPicker('Color de fondo','background_color','Fondo general de la carta')}</div><div className="mt-4 overflow-hidden rounded-xl border border-slate-200"><div className="p-4 text-white" style={{backgroundColor:config.secondary_color}}><span className="text-xs font-black uppercase tracking-wider" style={{color:config.accent}}>Vista previa</span><p className="mt-1 text-lg font-black">{config.name || 'Tu restaurante'}</p></div><div className="p-4" style={{backgroundColor:config.background_color}}><button type="button" className="rounded-lg px-4 py-2 text-xs font-black text-white" style={{backgroundColor:config.accent}}>Agregar al pedido</button></div></div></div>
                    <label className="block text-sm font-bold">Moneda de los precios<select disabled={currencyLocked} aria-label="Moneda del restaurante" value={config.currency} onChange={e=>setConfig({...config,currency:e.target.value as 'USD'|'CUP'})} className={input}><option value="USD">USD · Dólares</option><option value="CUP">CUP · Pesos cubanos</option></select><span className="mt-2 block text-xs font-normal leading-relaxed text-slate-500">No convierte importes. Introduce los precios en esta moneda. Se mantiene fija después de publicar.</span></label>
                  </div>
                </div>
              </div>
            </section>
            <section className={card} aria-labelledby="hours-title"><div className="mb-5 flex items-start gap-3"><Clock3 size={23} className="shrink-0"/><div><h2 id="hours-title" className="text-lg font-black">Horarios y entrega</h2><p className="mt-1 text-xs text-slate-500">Información para que tus clientes sepan qué esperar.</p></div></div>
              <label className="block text-sm font-bold">Horario informativo<input maxLength={200} placeholder="Ej. Almuerzos de lunes a sábado" value={config.hours_note} onChange={e=>setConfig({...config,hours_note:e.target.value})} className={input}/><span className="mt-2 block text-xs font-normal leading-relaxed text-slate-500">Este texto no abre ni cierra el menú automáticamente. Para pausar pedidos usa <Link href="/admin/menu/operacion" className="font-bold text-blue-700 underline">Disponibilidad</Link>.</span></label>
              <label className="mt-5 block text-sm font-bold">Información del delivery<input maxLength={250} placeholder="Ej. El restaurante confirma el tiempo de entrega" value={config.delivery_note} onChange={e=>setConfig({...config,delivery_note:e.target.value})} className={input}/></label>
            </section>
            <section id="zonas" className={`${card} scroll-mt-32`} aria-labelledby="zones-title"><div className="flex items-start gap-3"><MapPin size={23} className="shrink-0"/><div><h2 id="zones-title" className="text-lg font-black">Zonas y tarifas del restaurante</h2><p className="mt-1 text-xs leading-relaxed text-slate-500">Son independientes de las zonas de la tienda. Tarifas y mínimos en {config.currency}.</p></div></div>
              {!config.zones.length && <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">Añade la primera zona donde entrega el restaurante.</p>}
              <div className="mt-4 space-y-3">{config.zones.map((zone,index)=><div key={zone.id} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"><label className="min-w-0 text-xs font-bold">Zona<input aria-label={`Zona ${index+1}`} value={zone.name} required maxLength={120} className={input} onChange={e=>setConfig({...config,zones:config.zones.map(z=>z.id===zone.id?{...z,name:e.target.value}:z)})}/></label>{(['fee','minimum_order'] as const).map(field=><label key={field} className="min-w-0 text-xs font-bold">{field==='fee'?'Delivery':'Pedido mínimo'}<input aria-label={`${field==='fee'?'Tarifa':'Mínimo'} zona ${index+1}`} type="number" min="0" max="100000" step="0.01" required value={zone[field]} className={input} onChange={e=>setConfig({...config,zones:config.zones.map(z=>z.id===zone.id?{...z,[field]:Number(e.target.value)}:z) as RestaurantSection['zones']})}/></label>)}<button type="button" aria-label={`Quitar zona ${index+1}`} onClick={()=>setConfig({...config,zones:config.zones.filter(z=>z.id!==zone.id)})} className="flex min-h-12 items-center justify-center self-end rounded-xl bg-red-50 p-3 text-red-700"><Trash2 size={18}/></button></div>)}</div>
              <button type="button" disabled={config.zones.length>=50} onClick={()=>setConfig({...config,zones:[...config.zones,{id:crypto.randomUUID(),name:'',fee:0,minimum_order:0}]})} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold disabled:opacity-50"><Plus size={16}/>Añadir zona</button>
            </section>
          </div>
          <aside className="min-w-0 space-y-5">
            <section className={card}><h2 className="flex items-center gap-3 text-lg font-black"><ClipboardCheck size={23}/>Antes de publicar</h2><p className="mt-2 text-xs leading-relaxed text-slate-500">Revisa estos pasos antes de activar el restaurante.</p><ul className="mt-5 space-y-5">
              <li className="flex items-start gap-3"><span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${config.name.trim() ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300'}`}>{config.name.trim() && <Check size={15}/>}</span><div><p className="text-sm font-bold">Nombre e identidad</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Define el nombre, la moneda y la presentación.</p></div></li>
              <li><Link href="/admin/menu" className="flex min-h-11 items-center gap-3 text-sm font-bold text-blue-700"><ArrowRight size={20}/>Revisar categorías y platos</Link><p className="pl-8 text-xs leading-relaxed text-slate-500">Necesitas al menos un plato activo para delivery.</p></li>
              <li className="flex items-start gap-3"><span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${config.zones.some(z=>z.name.trim()) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-300'}`}>{config.zones.some(z=>z.name.trim()) && <Check size={15}/>}</span><div><a href="#zonas" className="text-sm font-bold hover:underline">Zonas de entrega</a><p className="mt-1 text-xs leading-relaxed text-slate-500">Configura la cobertura, tarifas y pedidos mínimos.</p></div></li>
            </ul></section>
            <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-blue-900"><Info size={23} className="shrink-0"/><div><h2 className="text-sm font-black">Una sección independiente</h2><p className="mt-2 text-sm leading-relaxed">{RESTAURANT_NOTICE}</p><p className="mt-3 text-xs leading-relaxed">Los pedidos llegan al WhatsApp de Águila. Pago a coordinar; no utiliza el checkout ni Stripe de la tienda.</p></div></div>
            <section className={card}><h2 className="text-sm font-black">Administra el restaurante</h2><div className="mt-3 space-y-2">{[['/admin/menu','Categorías y platos'],['/admin/menu/ordenes','Pedidos del restaurante'],['/admin/menu/operacion','Disponibilidad']].map(([href,label])=><Link key={href} href={href} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">{label}<ArrowRight size={16}/></Link>)}</div></section>
          </aside>
        </div>
      </fieldset>
      <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-40 border-t border-slate-200 bg-white p-3 shadow-[0_-4px_20px_rgba(15,23,42,0.06)] sm:px-6 sm:py-4 xl:bottom-0 xl:left-72">
        <div className="mx-auto max-w-7xl">{error && <p role="alert" className="mb-3 max-h-24 overflow-y-auto rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p>}{success && <p role="status" className="mb-3 max-h-24 overflow-y-auto rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{success}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Revisa los datos antes de publicar.</p><button disabled={saving||uploading||!version} type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#061b3a] px-6 py-3 text-sm font-black text-white disabled:opacity-50 sm:w-auto">{saving?<Loader2 className="animate-spin" size={18}/>:<Save size={18}/>}Guardar cambios</button></div></div>
      </div>
    </form>}
  </div>;
}
