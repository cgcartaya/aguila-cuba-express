import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRestaurantSection } from '@/lib/restaurant/server';
import { parseRestaurantSection } from '@/lib/restaurant/section';
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function access(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('store_id') || '';
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { denied: reply({ error: 'Inicia sesión.' }, 401) };
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  if (!auth.user) return { denied: reply({ error: 'Sesión no válida.' }, 401) };
  const { data: profile } = await supabaseAdmin.from('profiles').select('role,active').eq('id', auth.user.id).maybeSingle();
  if (!profile?.active) return { denied: reply({ error: 'Sin acceso.' }, 403) };
  if (profile.role !== 'super_admin') {
    const { data: member } = await supabaseAdmin.from('store_users').select('role').eq('store_id', storeId).eq('user_id', auth.user.id).eq('active', true).maybeSingle();
    if (!member || !['OWNER', 'ADMIN'].includes(String(member.role).toUpperCase())) return { denied: reply({ error: 'Solo el dueño o administrador de Águila puede configurar el restaurante.' }, 403) };
  }
  const { data: store } = await supabaseAdmin.from('stores').select('id').eq('id', storeId).eq('slug', 'aguila').eq('is_active', true).maybeSingle();
  return store ? { storeId: store.id } : { denied: reply({ error: 'Tienda no disponible.' }, 404) };
}
export async function GET(request: NextRequest) {
  try { const auth = await access(request); if (auth.denied) return auth.denied; return reply(await getRestaurantSection(auth.storeId!)); }
  catch { return reply({ error: 'No se pudo cargar la configuración.' }, 500); }
}
export async function PUT(request: NextRequest) {
  try {
    const auth = await access(request); if (auth.denied) return auth.denied;
    const body = await request.json();
    let config;
    try { config = parseRestaurantSection(body.config); } catch (error) { return reply({ error: error instanceof Error ? error.message : 'Configuración no válida.' }, 400); }
    const current = await getRestaurantSection(auth.storeId!);
    if (current.currency_locked && current.config.currency !== config.currency) return reply({ error: 'La moneda debe mantenerse porque el restaurante ya fue publicado.' }, 409);
    if (config.enabled) {
      const [{ count, error }, { data: settings, error: settingsError }] = await Promise.all([
        supabaseAdmin.from('menu_items').select('id,menu_categories!inner(is_active,venue_type)', { count: 'exact', head: true }).eq('store_id', auth.storeId!).eq('is_active', true).eq('available_delivery', true).eq('menu_categories.is_active', true).neq('menu_categories.venue_type', 'bar'),
        supabaseAdmin.from('store_settings').select('whatsapp').eq('store_id', auth.storeId!).maybeSingle(),
      ]);
      if (error || settingsError) throw error || settingsError;
      if (!count) return reply({ error: 'Agrega al menos un plato activo disponible para delivery antes de publicar.' }, 400);
      if (String(settings?.whatsapp || '').replace(/\D/g, '').length < 7) return reply({ error: 'Configura el WhatsApp de Águila en Ajustes generales antes de publicar.' }, 400);
    }
    if (!body.updated_at) return reply({ error: 'Recarga la configuración antes de guardar.' }, 409);
    const { data, error } = await supabaseAdmin.from('store_restaurant_sections').update({ config, currency_locked: current.currency_locked || config.enabled, updated_at: new Date().toISOString() }).eq('store_id', auth.storeId!).eq('updated_at', body.updated_at).select('config,updated_at,currency_locked').maybeSingle();
    if (error) throw error;
    if (!data) return reply({ error: 'La configuración cambió en otra ventana. Recarga antes de guardar.' }, 409);
    return reply(data);
  } catch { return reply({ error: 'No se pudo guardar la configuración.' }, 500); }
}
