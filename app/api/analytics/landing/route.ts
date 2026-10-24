import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { LANDING_PERIODS, landingWindow, summarizeLanding, type LandingEvent, type LandingPeriod } from '@/lib/analytics/landing-summary';

export const dynamic = 'force-dynamic';
const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId') || '';
  const period = request.nextUrl.searchParams.get('period') || 'this_month';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId) || !LANDING_PERIODS.includes(period as LandingPeriod)) return respond({ error: 'Tienda o período no válido.' }, 400);
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return respond({ error: 'Inicia sesión para ver las estadísticas.' }, 401);
  try {
    const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !auth.user) return respond({ error: 'Sesión no válida.' }, 401);
    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('role,active').eq('id', auth.user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.active) return respond({ error: 'No tienes acceso a esta tienda.' }, 403);
    if (profile.role !== 'super_admin') {
      const { data: member, error } = await supabaseAdmin.from('store_users').select('id').eq('store_id', storeId).eq('user_id', auth.user.id).eq('active', true).maybeSingle();
      if (error) throw error;
      if (!member) return respond({ error: 'No tienes acceso a esta tienda.' }, 403);
    }
    const { data: store, error: storeError } = await supabaseAdmin.from('stores').select('id').eq('id', storeId).eq('is_active', true).maybeSingle();
    if (storeError) throw storeError;
    if (!store) return respond({ error: 'Tienda no encontrada.' }, 404);
    const { data: settings, error: settingsError } = await supabaseAdmin.from('pickup_service_settings').select('timezone').eq('store_id', storeId).maybeSingle();
    if (settingsError) throw settingsError;
    const window = landingWindow(period as LandingPeriod, new Date(), settings?.timezone);
    const rows: LandingEvent[] = [];
    const pageSize = 1000;
    // Fixed end timestamp and stable order avoid overlap between pages. Never return a truncated total.
    for (let offset = 0; offset <= 50000; offset += pageSize) {
      const { data, error } = await supabaseAdmin.from('analytics_events').select('session_id,visitor_id,created_at')
        .eq('store_id', storeId).eq('event_name', 'page_view').eq('path', '/')
        .gte('created_at', window.start).lt('created_at', window.end)
        .order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + pageSize - 1);
      if (error) throw error;
      if (offset === 50000 && data?.length) return respond({ error: 'Este período supera el límite de consulta. Selecciona un período más corto.' }, 422);
      rows.push(...(data || []));
      if (!data || data.length < pageSize) break;
    }
    return respond(summarizeLanding(rows, window));
  } catch (error) {
    console.error('Error consultando visitas de la landing:', error instanceof Error ? error.message : 'consulta fallida');
    return respond({ error: 'No se pudieron cargar las estadísticas. Intenta de nuevo.' }, 500);
  }
}
