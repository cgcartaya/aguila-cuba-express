import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-admin';

const translated = z.object({ en: z.string().trim().min(1), es: z.string().trim().min(1) });
const published = z.object({
  description: translated,
  image: z.string().url().refine((url) => url.startsWith('https://')),
  seoTitle: translated,
  seoDescription: translated,
  cities: z.array(z.string()).default([]),
  experiences: z.array(translated).default([]),
  coverageConfirmed: z.literal(true),
});

export async function getDmcDestinations() {
  const store = await supabaseAdmin.from('stores').select('id')
    .eq('slug', 'luxury-travel-point').eq('is_active', true).maybeSingle();
  if (store.error) throw store.error;
  if (!store.data) return [];
  const result = await supabaseAdmin.from('dmc_destinations')
    .select('name,slug,published_content').eq('store_id', store.data.id)
    .not('published_at', 'is', null).order('name');
  // The public pages can be reviewed before the catalog migration is applied.
  if (result.error?.code === 'PGRST205') return [];
  if (result.error) throw result.error;
  return result.data.flatMap((row) => {
    const content = published.safeParse(row.published_content);
    return content.success ? [{ name: row.name, slug: row.slug, ...content.data }] : [];
  });
}
