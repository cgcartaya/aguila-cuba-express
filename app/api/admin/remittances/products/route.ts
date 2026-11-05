import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { adminAccess, failure, reply } from '@/lib/remittances/server';
export async function GET(request: NextRequest) {
 try {
  const storeId = request.nextUrl.searchParams.get('storeId') ?? '';
  await adminAccess(request, storeId, true);
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().slice(0, 80).replace(/[%_]/g, '');
  let query = supabaseAdmin.from('products').select('id,name,price,stock').eq('store_id', storeId)
   .eq('is_active', true).eq('combo_only', false).is('deleted_at', null).gt('stock', 0).order('name').limit(30);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  if (error) throw Error('products_unavailable');
  return reply({ products: data });
 } catch (error) { return failure(error); }
}
