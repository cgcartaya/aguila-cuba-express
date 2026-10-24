import { supabaseAdmin } from '@/lib/supabase-admin';
import { emptyRestaurantSection, parseRestaurantSection } from './section';
export async function getRestaurantSection(storeId: string) {
  const { data, error } = await supabaseAdmin.from('store_restaurant_sections').select('config,updated_at,currency_locked').eq('store_id', storeId).maybeSingle();
  if (error) throw error;
  return { config: data ? parseRestaurantSection(data.config) : emptyRestaurantSection(), updated_at: data?.updated_at || null, currency_locked: data?.currency_locked === true };
}
