import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getRestaurantSection } from '@/lib/restaurant/server';
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('store');
  if (slug !== 'aguila') return NextResponse.json({ section: null });
  try {
    const { data: store } = await supabaseAdmin.from('stores').select('id').eq('slug', slug).eq('is_active', true).eq('module_menu_enabled', true).maybeSingle();
    const section = store ? (await getRestaurantSection(store.id)).config : null;
    return NextResponse.json({ section: section?.enabled ? section : null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ section: null }, { status: 503 }); }
}
