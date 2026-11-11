import { supabaseAdmin } from '@/lib/supabase-admin';
import { LUXURY_SLUG } from '@/lib/travel/types';

export async function GET() {
  const headers = { 'Cache-Control': 'no-store' };
  const { data: store, error } = await supabaseAdmin.from('stores').select('id')
    .eq('slug', LUXURY_SLUG).eq('is_active', true).maybeSingle();
  if (error || !store) return Response.json({ error: 'Catalog unavailable' }, { status: 503, headers });

  const storeId = store.id;
  const [rates, services, countries, provinces, municipalities, locations] = await Promise.all([
    supabaseAdmin.from('shipping_rates').select('id,service_type_id,transport_mode,scope_type,country_id,province_id,municipality_id,location_id,rate_per_lb,weight_threshold_lb,rate_at_or_above_threshold,minimum_weight_lb,maximum_weight_lb,fixed_fee,minimum_charge,priority').eq('store_id', storeId).eq('is_active', true),
    supabaseAdmin.from('shipping_service_types').select('id,name,billing_mode').eq('store_id', storeId).eq('is_active', true),
    supabaseAdmin.from('shipping_countries').select('id,name').eq('store_id', storeId).eq('is_active', true),
    supabaseAdmin.from('shipping_provinces').select('id,name,country_id').eq('store_id', storeId).eq('is_active', true),
    supabaseAdmin.from('shipping_municipalities').select('id,name,province_id').eq('store_id', storeId).eq('is_active', true),
    supabaseAdmin.from('shipping_locations').select('id,name,municipality_id').eq('store_id', storeId).eq('is_active', true),
  ]);
  if ([rates, services, countries, provinces, municipalities, locations].some(result => result.error)) {
    return Response.json({ error: 'Catalog unavailable' }, { status: 503, headers });
  }

  const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map(row => [row.id, row]));
  const serviceById = byId(services.data ?? []);
  const countryById = byId(countries.data ?? []);
  const provinceById = byId(provinces.data ?? []);
  const municipalityById = byId(municipalities.data ?? []);
  const locationById = byId(locations.data ?? []);

  const options = (rates.data ?? []).flatMap(rate => {
    const service = serviceById.get(rate.service_type_id);
    if (!service || service.billing_mode !== 'per_lb') return [];
    const location = rate.scope_type === 'location' ? locationById.get(rate.location_id) : undefined;
    const municipality = municipalityById.get(location?.municipality_id ?? (rate.scope_type === 'municipality' ? rate.municipality_id : ''));
    const province = provinceById.get(municipality?.province_id ?? (rate.scope_type === 'province' ? rate.province_id : ''));
    const country = countryById.get(province?.country_id ?? (rate.scope_type === 'country' ? rate.country_id : ''));
    if (!country || (rate.scope_type === 'location' && !location) ||
      (['municipality', 'location'].includes(rate.scope_type) && !municipality) ||
      (rate.scope_type !== 'country' && !province)) return [];
    return [{
      id: rate.id,
      group: [service.id, rate.transport_mode, country.id, province?.id, municipality?.id, location?.id].join('/'),
      service: service.name,
      transport: rate.transport_mode,
      destination: [country.name, province?.name, municipality?.name, location?.name].filter(Boolean).join(' / '),
      priority: Number(rate.priority ?? 0),
      rate_per_lb: Number(rate.rate_per_lb),
      weight_threshold_lb: rate.weight_threshold_lb == null ? null : Number(rate.weight_threshold_lb),
      rate_at_or_above_threshold: rate.rate_at_or_above_threshold == null ? null : Number(rate.rate_at_or_above_threshold),
      minimum: Number(rate.minimum_weight_lb ?? 0),
      maximum: rate.maximum_weight_lb == null ? null : Number(rate.maximum_weight_lb),
      fee: Number(rate.fixed_fee ?? 0),
      minimumCharge: Number(rate.minimum_charge ?? 0),
    }];
  });
  return Response.json({ options }, { headers });
}
