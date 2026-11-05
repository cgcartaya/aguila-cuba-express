import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { adminAccess, failure, readBody, reply, RemittanceError } from '@/lib/remittances/server';
import { whatsappConfiguration } from '@/lib/notifications/alvarez-remittance-whatsapp';
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get('storeId') ?? '';
    await adminAccess(request, storeId);
    const config = await whatsappConfiguration();
    const { data, error } = await supabaseAdmin.from('alvarez_remittance_notifications')
      .select('id,source_kind,source_id,state,attempts,last_error,created_at,sent_at').eq('store_id', storeId)
      .order('created_at', { ascending: false }).limit(20);
    if (error) throw new Error('queue_unavailable');
    return reply({ ready: config.ready, reason: config.ready ? null : config.reason, jobs: data });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const body = await readBody(request);
    if (typeof body.storeId !== 'string' || typeof body.id !== 'string') throw new RemittanceError('Solicitud inválida.');
    await adminAccess(request, body.storeId, true);
    // A human must check the group before replaying any failed or ambiguous attempt.
    if (body.confirmedNotReceived !== true) throw new RemittanceError('Comprueba primero que el mensaje no llegó al grupo.');
    const { data, error } = await supabaseAdmin.from('alvarez_remittance_notifications')
      .update({ state: 'pending', claim_token: null, claimed_at: null, last_error: null })
      .eq('id', body.id).eq('store_id', body.storeId).in('state', ['failed', 'uncertain']).select('id').maybeSingle();
    if (error) throw new Error('retry_failed');
    if (!data) throw new RemittanceError('El aviso ya cambió de estado.', 409);
    return reply({ ok: true });
  } catch (error) { return failure(error); }
}
