import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { adminAccess, failure, reply } from '@/lib/remittances/server';
export async function GET(request: NextRequest) {
 try {
  const storeId = request.nextUrl.searchParams.get('storeId') ?? '';
  await adminAccess(request, storeId, true);
  const search = (request.nextUrl.searchParams.get('search') ?? '').trim().slice(0, 80).replace(/[%_]/g, '');
  const filter = request.nextUrl.searchParams.get('kind');
  let products = supabaseAdmin.from('products').select('id,name,price,stock').eq('store_id', storeId)
   .eq('is_active', true).eq('combo_only', false).is('deleted_at', null).gt('stock', 0).order('name').limit(30);
  let combos = supabaseAdmin.from('combos')
   .select('id,name,price,combo_items(product_id,quantity,products(store_id,stock,is_active,deleted_at))')
   .eq('store_id', storeId).eq('is_active', true).is('deleted_at', null).order('name').limit(30);
  if (search) {
   products = products.ilike('name', `%${search}%`);
   combos = combos.ilike('name', `%${search}%`);
  }
  const [productResult, comboResult] = await Promise.all([
   filter === 'combo' ? { data: [], error: null } : products,
   filter === 'product' ? { data: [], error: null } : combos,
  ]);
  if (productResult.error || comboResult.error) throw Error('products_unavailable');
  return reply({ products: [
   ...(productResult.data ?? []).map(product => ({ ...product, kind: 'product', price: Number(product.price) })),
   ...(comboResult.data ?? []).map(combo => {
    const components = new Map<string, { quantity: number; stock: number }>();
    for (const item of combo.combo_items ?? []) {
     const product = Array.isArray(item.products) ? item.products[0] : item.products;
     const available = product?.store_id === storeId && product.is_active && !product.deleted_at;
     const quantity = Number(item.quantity);
     if (!available || !Number.isInteger(quantity) || quantity < 1) {
      return { id: combo.id, name: combo.name, kind: 'combo', price: Number(combo.price), stock: 0 };
     }
     components.set(item.product_id, { quantity: (components.get(item.product_id)?.quantity ?? 0) + quantity, stock: Number(product.stock) });
    }
    const stock = components.size ? Math.min(...Array.from(components.values(), item => Math.floor(item.stock / item.quantity))) : 0;
    return { id: combo.id, name: combo.name, kind: 'combo', price: Number(combo.price), stock };
   }),
  ] });
 } catch (error) { return failure(error); }
}
