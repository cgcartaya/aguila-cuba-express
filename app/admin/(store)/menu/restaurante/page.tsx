"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Save, Trash2, UtensilsCrossed, Upload } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/lib/supabase';
import { optimizeImageFile } from '@/lib/images/optimizeImage';
import { emptyRestaurantSection, RESTAURANT_NOTICE, RESTAURANT_PATH, type RestaurantSection } from '@/lib/restaurant/section';

export default function RestaurantSettingsPage() {
  const { store: accessStore, isSuperAdmin, loading: accessLoading } = useAdminAccess();
  const { store: selectedStore, loading: storeLoading } = useStore();
  const store = useMemo(() => isSuperAdmin ? selectedStore || accessStore : accessStore, [isSuperAdmin, selectedStore, accessStore]);
  return <main className="min-h-screen bg-slate-50 p-4 pb-[calc(8rem+env(safe-area-inset-bottom))] md:p-8 md:pb-32">{accessLoading || storeLoading ? <p>Cargando tienda…</p> : store?.slug === 'aguila' ? <RestaurantForm key={store.id} storeId={store.id} /> : <p>Esta sección está preparada para Águila Express.</p>}</main>;
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
  const input = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base font-normal';
  return <div className="mx-auto max-w-4xl"><div className="rounded-3xl bg-[#061b3a] p-6 text-white"><UtensilsCrossed /><h1 className="mt-3 text-2xl font-black">Restaurante asociado de Águila</h1><p className="mt-2 text-sm text-blue-100">Una sola administración. Catálogo, carrito, pedidos y delivery separados de la tienda.</p></div>
    <div className="my-5 flex flex-wrap gap-2">{[['/admin/menu','Categorías y platos'],['/admin/menu/ordenes','Pedidos del restaurante'],['/admin/menu/operacion','Pausar pedidos'],[RESTAURANT_PATH,'Ver restaurante']].filter(([href])=>href!==RESTAURANT_PATH||config.enabled).map(([href,label]) => <Link key={href} href={href} className="rounded-xl border bg-white px-4 py-3 text-xs font-bold text-blue-800">{label}</Link>)}</div>
    {loading ? <p>Cargando configuración…</p> : <form onSubmit={save} className="space-y-5 rounded-3xl border bg-white p-5 sm:p-7">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-800">{error}</p>}{success && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{success}</p>}
      <fieldset disabled={saving || uploading || !version} className="space-y-5 disabled:opacity-70">
        <label className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm font-bold"><input type="checkbox" className="mt-1 h-5 w-5" checked={config.enabled} onChange={e=>setConfig({...config,enabled:e.target.checked})} /><span>Publicar la sección del restaurante<small className="mt-1 block font-normal">Actívala cuando el nombre, menú y zonas estén preparados. Mientras esté apagada no se aceptarán pedidos.</small></span></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Nombre del restaurante<input aria-label="Nombre del restaurante" maxLength={100} value={config.name} onChange={e=>setConfig({...config,name:e.target.value})} className={input}/></label><label className="text-sm font-bold">Moneda de los precios<select disabled={currencyLocked} aria-label="Moneda del restaurante" value={config.currency} onChange={e=>setConfig({...config,currency:e.target.value as 'USD'|'CUP'})} className={input}><option value="USD">USD · Dólares</option><option value="CUP">CUP · Pesos cubanos</option></select><small className="block font-normal text-slate-500">No convierte importes. Introduce los precios en esta moneda. Se mantiene fija después de publicar el restaurante.</small></label></div>
        <label className="block text-sm font-bold">Descripción<textarea maxLength={400} value={config.description} onChange={e=>setConfig({...config,description:e.target.value})} className={input}/></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Logo<input aria-label="URL del logo" type="url" placeholder="https://…" value={config.logo_url} onChange={e=>setConfig({...config,logo_url:e.target.value})} className={input}/><span className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs"><Upload size={15}/>{uploading?'Subiendo…':'Subir logo'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>void upload(e.target.files?.[0])}/></span></label><label className="text-sm font-bold">Color distintivo<input aria-label="Color del restaurante" type="color" value={config.accent} onChange={e=>setConfig({...config,accent:e.target.value})} className="mt-2 block h-12 w-full rounded-xl border p-1"/></label></div>
        <label className="block text-sm font-bold">Horario informativo<input maxLength={200} placeholder="Ej. Almuerzos de lunes a sábado" value={config.hours_note} onChange={e=>setConfig({...config,hours_note:e.target.value})} className={input}/><small className="font-normal text-slate-500">Para cerrar temporalmente usa Pausar pedidos; este texto no abre ni cierra el menú automáticamente.</small></label>
        <label className="block text-sm font-bold">Información del delivery<input maxLength={250} placeholder="Ej. El restaurante confirma el tiempo de entrega" value={config.delivery_note} onChange={e=>setConfig({...config,delivery_note:e.target.value})} className={input}/></label>
        <div><h2 className="font-black">Zonas y tarifas del restaurante</h2><p className="mt-1 text-xs text-slate-500">Son independientes de las zonas de la tienda. Tarifas y mínimos en {config.currency}.</p><div className="mt-3 space-y-3">{config.zones.map((zone,index)=><div key={zone.id} className="grid gap-3 rounded-2xl border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]"><label className="text-xs font-bold">Zona<input aria-label={`Zona ${index+1}`} value={zone.name} required maxLength={120} className={input} onChange={e=>setConfig({...config,zones:config.zones.map(z=>z.id===zone.id?{...z,name:e.target.value}:z)})}/></label>{(['fee','minimum_order'] as const).map(field=><label key={field} className="text-xs font-bold">{field==='fee'?'Delivery':'Pedido mínimo'}<input aria-label={`${field==='fee'?'Tarifa':'Mínimo'} zona ${index+1}`} type="number" min="0" max="100000" step="0.01" required value={zone[field]} className={input} onChange={e=>setConfig({...config,zones:config.zones.map(z=>z.id===zone.id?{...z,[field]:Number(e.target.value)}:z) as RestaurantSection['zones']})}/></label>)}<button type="button" aria-label={`Quitar zona ${index+1}`} onClick={()=>setConfig({...config,zones:config.zones.filter(z=>z.id!==zone.id)})} className="min-h-11 self-end rounded-xl bg-red-50 p-3 text-red-700"><Trash2 size={18}/></button></div>)}</div><button type="button" disabled={config.zones.length>=50} onClick={()=>setConfig({...config,zones:[...config.zones,{id:crypto.randomUUID(),name:'',fee:0,minimum_order:0}]})} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold"><Plus size={16}/>Añadir zona</button></div>
        <div className="rounded-2xl border p-4 text-sm" style={{borderColor:config.accent}}><p className="font-black" style={{color:config.accent}}>{config.name||'Restaurante asociado'} · En Águila Express</p><p className="mt-2">{RESTAURANT_NOTICE}</p><p className="mt-2 text-xs text-slate-500">Los pedidos llegan a Águila por su WhatsApp configurado. Pago a coordinar; no utiliza el checkout ni Stripe de la tienda.</p></div>
        <button disabled={saving||uploading} type="submit" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#061b3a] p-4 font-black text-white">{saving?<Loader2 className="animate-spin" size={18}/>:<Save size={18}/>}Guardar configuración</button>
      </fieldset>
    </form>}
  </div>;
}
