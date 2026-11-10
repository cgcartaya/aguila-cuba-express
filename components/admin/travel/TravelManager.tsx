'use client';
import { useEffect, useState, type ChangeEvent } from 'react';
import { Plus, Upload, Search, Copy, Pencil, Trash2, RefreshCw, Plane } from 'lucide-react';
import { deleteTravelPackage, listTravelPackages, saveTravelPackage, uploadTravelAsset } from '@/lib/services/travel-admin';
import { availableDepartures, emptyTravelContent, isPackageVisible, type TravelContent, type TravelPackage } from '@/lib/travel/types';
import TravelEditor from './TravelEditor';

const button = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50';
const statusLabels = { draft: 'Borrador', published: 'Publicada', paused: 'Pausada', archived: 'Archivada' };
export default function TravelManager({ storeId }: { storeId: string }) {
  const [packages, setPackages] = useState<TravelPackage[]>([]);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [progress, setProgress] = useState('');
  const [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<{ previous?: TravelPackage; content: TravelContent; warnings?: string[] } | null>(null);
  async function load() {
    setLoading(true); setError('');
    try { setPackages(await listTravelPackages(storeId)); }
    catch (cause) { setError((cause as Error).message); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    listTravelPackages(storeId).then(data => { if (active) setPackages(data); }).catch(cause => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storeId]);
  async function importPdf(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []); event.target.value = '';
    if (!files.length) return;
    if (files.length > 10) { setError('Importa hasta 10 PDF por lote.'); return; }
    setBusy(true); setError(''); setNotice('');
    const rows = [...packages], failures: string[] = [];
    let first: TravelPackage | undefined, imported = 0;
    try {
      const { extractTravelPdf } = await import('@/lib/travel/import-pdf');
      for (const file of files) {
        try {
          if (file.size > 50 * 1024 * 1024) throw new Error('El PDF supera los 50 MB.');
          const hashBytes = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
          const hash = Array.from(new Uint8Array(hashBytes), byte => byte.toString(16).padStart(2, '0')).join('');
          const existing = rows.find(pkg => pkg.content.source_hash === hash);
          if (existing) { first ||= existing; continue; }
          const result = await extractTravelPdf(file, message => setProgress(`${file.name} · ${message}`));
          result.content.source_hash = hash;
          setProgress(`${file.name} · Guardando documento y fotografías…`);
          result.content.pdf = await uploadTravelAsset(storeId, file, 'pdf');
          const images: string[] = [];
          for (const image of result.images) {
            try { images.push(await uploadTravelAsset(storeId, image, 'image')); }
            catch { result.warnings.push('Una fotografía no se pudo subir. Puedes añadirla desde el editor.'); }
          }
          result.content.image = images[0] || ''; result.content.gallery = images.slice(1);
          const row = await saveTravelPackage(storeId, result.content, 'draft');
          rows.push(row); first ||= row; imported++;
          setPackages([...rows]);
        } catch (cause) { failures.push(`${file.name}: ${(cause as Error).message || 'No se pudo importar.'}`); }
      }
      if (first) setEditing({ previous: first, content: structuredClone(first.content), warnings: first.content.review_notes });
      setNotice(imported ? `${imported} PDF importados como borrador. Revisa cada paquete antes de publicar.` : first ? 'El PDF ya estaba importado. Se abrió el paquete existente.' : '');
      setError(failures.join(' '));
    } catch (cause) { setError((cause as Error).message || 'No se pudo iniciar la importación.'); }
    finally { setBusy(false); setProgress(''); }
  }
  async function save(content: TravelContent, status: TravelPackage['status']) {
    const row = await saveTravelPackage(storeId, content, status, editing?.previous);
    setPackages(previous => previous.some(pkg => pkg.id === row.id) ? previous.map(pkg => pkg.id === row.id ? row : pkg) : [...previous, row]);
    setEditing(null); setNotice(status === 'published' ? 'Oferta publicada. Ya está disponible en la web.' : 'Paquete guardado.');
  }
  async function remove(pkg: TravelPackage) {
    if (!window.confirm(`¿Eliminar “${pkg.content.title}” y sus salidas? Se retirará de la web.`)) return;
    setBusy(true); setError('');
    try { await deleteTravelPackage(pkg); setPackages(previous => previous.filter(row => row.id !== pkg.id)); setNotice('Paquete eliminado.'); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }
  const visible = packages.filter(pkg => (!search || `${pkg.content.title} ${pkg.content.countries.join(' ')}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))) && (filter === 'all' || filter === 'expired' && pkg.status === 'published' && !isPackageVisible(pkg) || pkg.status === filter));
  return <div className="mx-auto max-w-7xl space-y-6 pb-20">
    <header className="rounded-3xl bg-[#0c2639] p-6 text-white sm:p-8"><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-amber-200">Luxury Travel Point</p><h1 className="text-3xl font-bold">Paquetes y salidas</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">Administra cada viaje, sus grupos y tarifas. Importa un PDF, revisa el programa y publica la oferta en tu web.</p><div className="mt-6 flex flex-wrap gap-3"><button type="button" className={button} disabled={busy} onClick={() => setEditing({ content: emptyTravelContent() })}><Plus size={18}/>Crear paquete</button><label className={`${button} cursor-pointer`}><Upload size={18}/>Importar PDF<input type="file" multiple accept="application/pdf" disabled={busy} className="sr-only" onChange={importPdf}/></label></div><p className="mt-3 text-xs text-slate-300">Hasta 10 PDF por lote, de 50 MB y 40 páginas cada uno. Las importaciones se guardan como borrador.</p></header>
    {progress && <p role="status" className="rounded-xl bg-blue-50 p-4 text-blue-900">{progress}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">{notice}</p>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Paquetes', packages.length], ['Visibles en la web', packages.filter(pkg => isPackageVisible(pkg)).length], ['Borradores', packages.filter(pkg => pkg.status === 'draft').length], ['Salidas disponibles', packages.reduce((count, pkg) => count + (pkg.status === 'published' ? availableDepartures(pkg.content).length : 0), 0)]].map(([label, count]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-3xl text-slate-900">{count}</strong></div>)}</div>
    <div className="flex flex-wrap items-center gap-3"><label className="flex min-w-48 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3"><Search size={18}/><input className="w-full py-3 outline-none" aria-label="Buscar paquetes" placeholder="Buscar por viaje o destino" value={search} onChange={event => setSearch(event.target.value)}/></label><select className="rounded-xl border border-slate-200 bg-white p-3" aria-label="Estado de publicación" value={filter} onChange={event => setFilter(event.target.value)}><option value="all">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}<option value="expired">Sin salidas vigentes</option></select><button type="button" className={button} onClick={load} disabled={busy || loading}><RefreshCw size={18}/>Recargar</button></div>
    {loading ? <p>Cargando paquetes…</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(pkg => <article key={pkg.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{pkg.content.image ? <img src={pkg.content.image} alt="" loading="lazy" className="h-40 w-full object-cover"/> : <div className="flex h-40 items-center justify-center bg-slate-100"><Plane className="text-slate-400"/></div>}<div className="space-y-3 p-5"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{statusLabels[pkg.status]}</span>{pkg.status === 'published' && !isPackageVisible(pkg) && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs">Sin salidas vigentes</span>}{pkg.content.permanent && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs">Permanente</span>}</div><h2 className="text-lg font-bold text-slate-900">{pkg.content.title}</h2><p className="text-sm text-slate-500">{pkg.content.countries.join(' · ')}</p><p className="text-sm">{pkg.content.departures.length} salidas{pkg.content.days !== null ? ` · ${pkg.content.days} días` : ''}</p><div className="flex flex-wrap gap-2"><button className={button} type="button" disabled={busy} onClick={() => setEditing({ previous: pkg, content: structuredClone(pkg.content), warnings: pkg.content.review_notes })}><Pencil size={16}/>Editar</button><button className={button} type="button" disabled={busy} title="Copia el programa como borrador y elimina las fechas y tarifas para revisarlas" onClick={() => setEditing({ content: { ...structuredClone(pkg.content), title: `${pkg.content.title} · copia`, departures: [], source_hash: undefined } })}><Copy size={16}/>Duplicar</button><button className={button} type="button" disabled={busy} aria-label={`Eliminar ${pkg.content.title}`} onClick={() => remove(pkg)}><Trash2 size={16}/></button></div>{isPackageVisible(pkg) && <a className="inline-block text-sm font-semibold text-blue-800 underline" href={`/viajes/${pkg.id}`} target="_blank" rel="noopener noreferrer">Ver publicación</a>}</div></article>)}</div>}
    {!loading && !visible.length && <p className="rounded-2xl bg-white p-8 text-center text-slate-500">No hay paquetes con estos filtros.</p>}
    {editing && <TravelEditor key={editing.previous?.id || 'new'} storeId={storeId} initial={editing.content} initialStatus={editing.previous?.status || 'draft'} warnings={editing.warnings || []} onClose={() => setEditing(null)} onSave={save}/>}
  </div>;
}
