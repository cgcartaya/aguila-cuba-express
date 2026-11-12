import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { adminAccess, failure, readBody, reply, RemittanceError } from '@/lib/remittances/server';
import { loadWhatsappMessage, whatsappConfiguration } from '@/lib/notifications/alvarez-remittance-whatsapp';
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get('storeId') ?? '';
    await adminAccess(request, storeId);
    const config = await whatsappConfiguration();
    const { data, error } = await supabaseAdmin.from('alvarez_remittance_notifications')
      .select('id,source_kind,source_id,state,attempts,last_error,created_at,sent_at,manual_sent_by').eq('store_id', storeId)
      .order('created_at', { ascending: false }).limit(20);
    if (error) throw new Error('queue_unavailable');
    return reply({ ready: config.ready, reason: config.ready ? null : config.reason, jobs: data });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await readBody(request);
    if (body.action === 'prepare_manual' || body.action === 'confirm_manual' || body.action === 'release_manual') {
      return await manualAction(request, body);
    }
    if (typeof body.storeId !== 'string' || typeof body.id !== 'string') throw new RemittanceError('Solicitud inválida.');
    await adminAccess(request, body.storeId, true);
    // A human must check the group before replaying any failed or ambiguous attempt.
    if (body.confirmedNotReceived !== true) throw new RemittanceError('Comprueba primero que el mensaje no llegó al grupo.');
    const { data, error } = await supabaseAdmin.from('alvarez_remittance_notifications')
      .update({ state: 'pending', claim_token: null, claimed_at: null, last_error: null })
      .eq('id', body.id).eq('store_id', body.storeId).in('state', ['failed', 'uncertain']).is('manual_reserved_by', null).select('id').maybeSingle();
    if (error) throw new Error('retry_failed');
    if (!data) throw new RemittanceError('El aviso ya cambió de estado.', 409);
    return reply({ ok: true });
  } catch (error) { return failure(error); }
}

async function manualAction(request: NextRequest, body: Record<string, unknown>) {
  const { storeId, sourceId, sourceKind, action } = body;
  if (typeof storeId !== 'string' || typeof sourceId !== 'string' ||
    (sourceKind !== 'order' && sourceKind !== 'shipment')) {
    throw new RemittanceError('Solicitud inválida.');
  }
  const actor = await adminAccess(request, storeId, true);
  const notifications = () => supabaseAdmin.from('alvarez_remittance_notifications');
  const findNotice = (kind: 'order' | 'shipment', id: string) => notifications()
    .select('id,source_kind,source_id,state,manual_reserved_by,manual_sent_by')
    .eq('store_id', storeId).eq('source_kind', kind).eq('source_id', id).maybeSingle();
  let { data: job, error } = await findNotice(sourceKind, sourceId);
  if (error) throw new Error('queue_unavailable');
  if (!job && sourceKind === 'shipment') {
    const { data: order, error: orderError } = await supabaseAdmin.from('remittance_orders').select('id')
      .eq('store_id', storeId).eq('shipment_id', sourceId).eq('status', 'paid').maybeSingle();
    if (orderError) throw new Error('source_unavailable');
    if (order) {
      ({ data: job, error } = await findNotice('order', order.id));
      if (error) throw new Error('queue_unavailable');
    }
  }
  if (!job) throw new RemittanceError('Este envío no tiene un aviso de WhatsApp asociado.', 404);
  if (job.state === 'accepted') {
    return reply({ state: job.manual_sent_by ? 'manual_sent' : 'accepted' });
  }
  if (action === 'prepare_manual') {
    if (!['pending', 'failed', 'uncertain'].includes(job.state) ||
      (job.manual_reserved_by && job.manual_reserved_by !== actor)) {
      throw new RemittanceError('Otro proceso u operador está gestionando el aviso.', 409);
    }
    const result = await loadWhatsappMessage({ store_id: storeId, source_id: job.source_id, source_kind: job.source_kind === 'order' ? 'order' : 'shipment' });
    if (!result.message) throw new RemittanceError('No se puede preparar el mensaje de este envío.', 409);
    const update = notifications().update({
      state: 'uncertain', last_error: 'manual_in_progress', manual_reserved_by: actor,
      claim_token: null, claimed_at: null,
    }).eq('id', job.id).eq('store_id', storeId).eq('state', job.state);
    const { data: reserved, error: reserveError } = await (job.manual_reserved_by
      ? update.eq('manual_reserved_by', actor)
      : update.is('manual_reserved_by', null)).select('id').maybeSingle();
    if (reserveError) throw new Error('manual_reservation_failed');
    if (!reserved) throw new RemittanceError('El estado del aviso cambió. Vuelve a abrirlo.', 409);
    return reply({ state: 'manual_in_progress', message: result.message });
  }
  if (job.state !== 'uncertain' || job.manual_reserved_by !== actor) {
    throw new RemittanceError('Abre el aviso para iniciar el envío manual.', 409);
  }
  const confirm = action === 'confirm_manual';
  const { data: updated, error: updateError } = await notifications().update(confirm ? {
    state: 'accepted', manual_sent_by: actor, manual_reserved_by: null,
    sent_at: new Date().toISOString(), last_error: null,
  } : { manual_reserved_by: null, last_error: 'manual_unconfirmed' })
    .eq('id', job.id).eq('store_id', storeId).eq('state', 'uncertain')
    .eq('manual_reserved_by', actor).select('id').maybeSingle();
  if (updateError) throw new Error('manual_update_failed');
  if (!updated) throw new RemittanceError('El estado del aviso cambió.', 409);
  return reply({ state: confirm ? 'manual_sent' : 'uncertain' });
}
