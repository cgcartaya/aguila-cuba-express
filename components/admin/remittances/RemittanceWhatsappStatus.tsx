"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
type Job = { id: string; source_id: string; state: string; last_error: string | null; manual_sent_by: string | null };
type Snapshot = { ready: boolean; reason: string | null; jobs: Job[] };
const labels: Record<string, string> = { pending: 'En cola', sending: 'Enviando', accepted: 'Aceptado por el proveedor', failed: 'No enviado', uncertain: 'Revisar en el grupo', cancelled: 'Cancelado' };
export default function RemittanceWhatsappStatus({ storeId }: { storeId: string }) {
  const [version, setVersion] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/admin/remittances/whatsapp?storeId=${encodeURIComponent(storeId)}`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, signal: abort.signal,
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'No se pudo consultar WhatsApp.');
        if (!abort.signal.aborted) { setSnapshot(body); setError(''); }
      } catch (cause) { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo consultar WhatsApp.'); }
    })();
    return () => abort.abort();
  }, [storeId, version]);
  async function retry(id: string) {
    if (!window.confirm('Comprueba el grupo Entrada de pedidos. ¿Confirmas que este aviso NO llegó y quieres volver a enviarlo?')) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/admin/remittances/whatsapp', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ storeId, id, confirmedNotReceived: true }),
      });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'No se pudo reintentar.'); }
      setVersion(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo reintentar.'); }
    finally { setBusy(false); }
  }
  return <details className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
    <summary className="cursor-pointer font-semibold">WhatsApp · Entrada de pedidos · {snapshot ? snapshot.ready ? 'Conectado' : 'Revisar conexión' : 'Consultar estado'}</summary>
    <p className="my-3 text-slate-600">Las nuevas remesas se avisan automáticamente. Aceptado por el proveedor no confirma lectura ni entrega. Si un resultado es incierto, revisa el grupo antes de reintentar.</p>
    {error && <p role="alert" className="my-2 text-red-700">{error}</p>}
    {snapshot && !snapshot.ready && <p className="my-2 text-amber-800">La conexión no está disponible ({snapshot.reason}). Los avisos permanecen registrados.</p>}
    <button type="button" className="my-2 rounded-lg border px-3 py-2" onClick={() => setVersion(value => value + 1)}>Actualizar estado</button>
    <ul className="divide-y divide-slate-100">{snapshot?.jobs.map(job => <li key={job.id} className="flex flex-wrap items-center gap-2 py-2">
      <span className="break-all">{job.source_id}</span><strong>{job.manual_sent_by ? 'Enviado manualmente' : job.last_error === 'manual_in_progress' ? 'Envío manual en curso' : labels[job.state] ?? job.state}</strong>
      {job.last_error !== 'manual_in_progress' && (job.state === 'failed' || job.state === 'uncertain') && <button type="button" disabled={busy} className="rounded-lg border px-3 py-2 disabled:opacity-50" onClick={() => void retry(job.id)}>Reintentar tras revisar</button>}
    </li>)}</ul>
    {snapshot?.jobs.length === 0 && <p>No hay avisos nuevos registrados.</p>}
  </details>;
}
