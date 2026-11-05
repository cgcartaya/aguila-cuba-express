"use client";
import Link from 'next/link';
import { BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
type Snapshot = { unread: number; asOf: string };
export default function RemittanceNotifications({ storeId }: { storeId: string }) {
 const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
 const [version, setVersion] = useState(0); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 useEffect(() => {
  const controller = new AbortController(); let running = false;
  async function refresh() {
   if (running || document.visibilityState === 'hidden') return;
   running = true;
   try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/remittances/notifications?${new URLSearchParams({ storeId })}`, { headers: { Authorization: `Bearer ${session?.access_token ?? ''}` }, signal: controller.signal });
    if (response.ok) { const data = await response.json(); if (!controller.signal.aborted) { setSnapshot(data); setError(''); } }
   } catch { /* A temporary connection failure must not remove a visible notification. */ }
   finally { running = false; }
  }
  void refresh();const interval = setInterval(() => void refresh(), 30000);
  const focus = () => void refresh();window.addEventListener('focus', focus);document.addEventListener('visibilitychange', focus);
  return () => { controller.abort(); clearInterval(interval); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
 }, [storeId, version]);
 async function markSeen() {
  if (!snapshot || busy) return;setBusy(true);setError('');
  try {
   const { data: { session } } = await supabase.auth.getSession();
   const response = await fetch('/api/admin/remittances/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ storeId, before: snapshot.asOf }) });
   if (!response.ok) throw Error();setSnapshot(null);setVersion(value => value + 1);
  } catch { setError('No se pudieron marcar las notificaciones. Inténtalo de nuevo.'); }
  finally { setBusy(false); }
 }
 if (!snapshot?.unread) return null;
 return <aside role="status" aria-live="polite" className="mx-4 my-3 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 xl:mx-6">
  <BellRing size={22} className="shrink-0" /><div className="flex-1"><strong>{snapshot.unread} {snapshot.unread === 1 ? 'compra de remesa sin revisar' : 'compras de remesas sin revisar'}</strong><p className="text-sm">Ya están guardadas aunque el cliente no envíe un WhatsApp.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}</div>
  <Link href="/admin/shipping/remittances?status=all" className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white">Revisar remesas</Link>
  <button type="button" disabled={busy} onClick={() => void markSeen()} className="rounded-xl border border-blue-200 px-3 py-3 text-sm font-semibold disabled:opacity-50">Marcar como vistas</button>
 </aside>;
}
