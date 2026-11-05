import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { applyPlatformFee, getPlatformFeePercent } from '@/lib/storefront/product-quantity-pricing';
import { adminAccess, failure, reply } from '@/lib/remittances/server';
export async function GET(request: NextRequest) {
 try {
  const storeId = request.nextUrl.searchParams.get('storeId') ?? '';
  await adminAccess(request, storeId, true);
  const { data: store, error: storeError } = await supabaseAdmin.from('stores').select('platform_fee_enabled,platform_fee_percent').eq('id', storeId).single();
  if (storeError) throw Error('pricing_unavailable');
  const feePercent = getPlatformFeePercent(store);
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().slice(0, 80).replace(/[%_]/g, '');
  let query = supabaseAdmin.from('products').select('id,name,price,stock').eq('store_id', storeId)
   .eq('is_active', true).eq('combo_only', false).is('deleted_at', null).gt('stock', 0).order('name').limit(30);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  if (error) throw Error('products_unavailable');
  return reply({ products: (data ?? []).map(product => ({ ...product, base_price: Number(product.price), price: applyPlatformFee(Number(product.price), feePercent), platform_fee_percent: feePercent })) });
 } catch (error) { return failure(error); }
}
