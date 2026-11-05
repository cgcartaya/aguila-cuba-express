import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { UUID } from '@/lib/remittances/validation';
import { adminAccess, failure, readBody, reply, RemittanceError } from '@/lib/remittances/server';
export async function GET(request: NextRequest) {
 try {
  const storeId = request.nextUrl.searchParams.get('storeId') ?? '';
  if (!UUID.test(storeId)) throw new RemittanceError('Tienda inválida.');
  const actor = await adminAccess(request, storeId);
  const asOf = new Date().toISOString();
  const { data: cursor, error: cursorError } = await supabaseAdmin.from('remittance_notification_reads').select('last_seen_at').eq('store_id', storeId).eq('user_id', actor).maybeSingle();
  if (cursorError) throw Error('cursor_unavailable');
  const { count, error } = await supabaseAdmin.from('remittance_orders').select('id', { count: 'exact', head: true })
   .eq('store_id', storeId).neq('status', 'cancelled').gt('created_at', cursor?.last_seen_at ?? '1970-01-01T00:00:00Z').lte('created_at', asOf);
  if (error) throw Error('notifications_unavailable');
  return reply({ unread: count ?? 0, asOf });
 } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
 try {
  const body = await readBody(request); const storeId = String(body.storeId ?? '');
  if (!UUID.test(storeId)) throw new RemittanceError('Tienda inválida.');
  const actor = await adminAccess(request, storeId);
  const before = Date.parse(String(body.before ?? ''));
  if (!Number.isFinite(before) || before > Date.now()) throw new RemittanceError('Fecha inválida.');
  const { error } = await supabaseAdmin.rpc('mark_remittance_notifications_seen', { p_store_id: storeId, p_user_id: actor, p_before: new Date(before).toISOString() });
  if (error) throw Error('notification_update_failed');
  return reply({ ok: true });
 } catch (error) { return failure(error); }
}
