import { publicSupabase } from '@/lib/supabase-public';
import { LUXURY_SLUG, isPackageVisible, validateTravelContent, type TravelPackage } from '@/lib/travel/types';

export async function getPublicTravelPackages(includeDetails = false): Promise<TravelPackage[]> {
  const { data: store, error: storeError } = await publicSupabase.from('stores').select('id').eq('slug', LUXURY_SLUG).eq('is_active', true).maybeSingle();
  if (storeError) throw new Error('No se pudo consultar la agencia.');
  if (!store) return [];
  const { data, error } = await publicSupabase.from('travel_packages').select('id,store_id,status,version,content,updated_at').eq('store_id', store.id).eq('status', 'published');
  if (error) throw new Error('No se pudo consultar el catálogo de viajes.');
  return ((data || []) as TravelPackage[]).filter(pkg => !validateTravelContent(pkg.content, 'draft') && isPackageVisible(pkg)).map(pkg => includeDetails ? pkg : { ...pkg, content: { ...pkg.content, gallery: [], itinerary: [], conditions: '', source_text: '', review_notes: undefined, source_hash: undefined } }).sort((a, b) => Number(b.content.featured) - Number(a.content.featured) || a.content.sort_order - b.content.sort_order || a.content.title.localeCompare(b.content.title, 'es'));
}
