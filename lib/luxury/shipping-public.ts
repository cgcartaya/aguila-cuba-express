import { publicSupabase } from '@/lib/supabase-public';
import { getPublicStoreBranding } from '@/lib/services/store-branding';
import { LUXURY_SLUG } from '@/lib/travel/types';
import { entrySchema } from './shipping';

export async function getLuxuryShipping() {
  const { data: store, error } = await publicSupabase.from('stores')
    .select('id').eq('slug', LUXURY_SLUG).eq('is_active', true).maybeSingle();
  if (error || !store) throw new Error('Luxury unavailable');

  const [result, branding] = await Promise.all([
    publicSupabase.from('luxury_shipping_catalog').select('*').eq('store_id', store.id).order('position').order('key'),
    getPublicStoreBranding(store.id),
  ]);
  if (result.error) throw new Error('Luxury shipping catalog unavailable');
  return {
    entries: (result.data ?? []).flatMap(row => {
      const parsed = entrySchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    }),
    whatsapp: branding.whatsappUrl ?? '',
  };
}
