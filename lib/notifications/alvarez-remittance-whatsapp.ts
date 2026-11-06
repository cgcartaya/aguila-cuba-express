import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { remittanceWhatsappMessage } from './remittance-whatsapp-message';

const API = 'https://app.timelines.ai/integrations/api';
const CHAT = '57099880';
type Job = { id: string; store_id: string; source_kind: 'order' | 'shipment'; source_id: string; claim_token: string };
type Source = Record<string, unknown> & { payload: Record<string, unknown> };
type State = 'accepted' | 'failed' | 'uncertain' | 'cancelled';

export async function whatsappConfiguration() {
  const token = process.env.ALVAREZ_TIMELINES_API_TOKEN?.trim();
  if (process.env.VERCEL_ENV !== 'production') return { ready: false, reason: 'production_only' } as const;
  if (!token || /^Bearer\s/i.test(token) || process.env.ALVAREZ_TIMELINES_CHAT_ID?.trim() !== CHAT)
    return { ready: false, reason: 'configuration_missing_or_invalid' } as const;
  try {
    const response = await fetch(`${API}/chats/${CHAT}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { ready: false, reason: `provider_${response.status}` } as const;
    const body = await response.json();
    const chat = body.data;
    if (body.status !== 'ok' || chat?.name?.trim().toLowerCase() !== 'entrada de pedidos' || chat?.is_group === false || (chat?.id != null && String(chat.id) !== CHAT))
      return { ready: false, reason: 'destination_mismatch' } as const;
    return { ready: true, token } as const;
  } catch { return { ready: false, reason: 'provider_unavailable' } as const; }
}

async function finish(job: Job, state: State, error: string | null, messageId: string | null = null) {
  const { error: dbError } = await supabaseAdmin.from('alvarez_remittance_notifications').update({
    state, last_error: error, provider_message_id: messageId,
    sent_at: state === 'accepted' ? new Date().toISOString() : null,
  }).eq('id', job.id).eq('claim_token', job.claim_token).eq('state', 'sending');
  if (dbError) throw new Error('notification_record_failed');
}

async function dispatch(job: Job, token: string) {
  const { data: store, error: storeError } = await supabaseAdmin.from('stores').select('id')
    .eq('id', job.store_id).eq('subdomain', 'alvarez-travel').eq('is_active', true).eq('module_shipping_enabled', true).maybeSingle();
  if (storeError) { await finish(job, 'failed', 'source_unavailable'); return; }
  if (!store) { await finish(job, 'cancelled', 'store_unavailable'); return; }
  const { data: settings, error: settingsError } = await supabaseAdmin.from('shipping_settings').select('currency').eq('store_id', job.store_id).maybeSingle();
  if (settingsError || settings?.currency !== 'USD') { await finish(job, 'failed', 'currency_unavailable'); return; }
  const order = job.source_kind === 'order';
  const { data: source, error } = await supabaseAdmin.from(order ? 'remittance_orders' : 'shipments')
    .select(order ? 'id,payload,amount,status' : 'id,sender_name,recipient_name,recipient_phone,recipient_phone_alt,recipient_address,notes,money_amount,money_delivery_currency,money_usd_to_cup,money_exchange_rate,money_delivery_amount,store_products,payment_status,contains_money,deleted_at,status')
    .eq('store_id', job.store_id).eq('id', job.source_id).maybeSingle<Source>();
  if (error) { await finish(job, 'failed', 'source_unavailable'); return; }
  if (!source || source.status === 'cancelled' || (!order && (source.deleted_at || !source.contains_money && (!Array.isArray(source.store_products) || !source.store_products.length)))) {
    await finish(job, 'cancelled', 'source_cancelled'); return;
  }
  let message: string;
  try {
    message = remittanceWhatsappMessage(job.source_id, order ? source.payload : source,
      order ? source.amount : source.money_amount);
  } catch { await finish(job, 'failed', 'invalid_source'); return; }
  // Once a POST starts, transport failures are ambiguous: require a human check.
  try {
    const response = await fetch(`${API}/chats/${CHAT}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }), signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      await finish(job, response.status >= 500 ? 'uncertain' : 'failed', `provider_${response.status}`); return;
    }
    const body = await response.json();
    const uid = body.data?.message_uid;
    if (body.status !== 'ok' || typeof uid !== 'string' || !uid) {
      await finish(job, 'uncertain', 'provider_response_unconfirmed'); return;
    }
    await finish(job, 'accepted', null, uid);
  } catch { await finish(job, 'uncertain', 'provider_result_unknown'); }
}

export async function drainRemittanceWhatsapp() {
  const config = await whatsappConfiguration();
  if (!config.ready) return { processed: 0, reason: config.reason };
  const { data, error } = await supabaseAdmin.rpc('claim_alvarez_remittance_notifications');
  if (error) throw new Error('notification_queue_unavailable');
  let processed = 0;
  for (const job of (data ?? []) as Job[]) {
    try { await dispatch(job, config.token); processed++; }
    catch { /* Lease becomes uncertain; do not leak customer data or credentials into logs. */ }
  }
  return { processed };
}
