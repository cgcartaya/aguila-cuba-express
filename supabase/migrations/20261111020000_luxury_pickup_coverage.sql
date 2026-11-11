-- Luxury Travel Point: initial Florida pickup coverage. Idempotent and tenant-scoped.
insert into public.pickup_service_settings
(store_id,is_enabled,country_code,country_name,region_code,region_name,base_city,timezone,currency_code,pickup_fee,max_preferred_dates,coverage_mode,city_selection_mode,allowed_cities,allowed_postal_codes,require_verified_address,address_validation_provider,public_headline,public_description)
select id,true,'US','United States','FL','Florida','Lehigh Acres','America/New_York','USD',0,3,'cities','selected',
'["Lehigh Acres","Fort Myers","North Fort Myers","Cape Coral","LaBelle","Bonita Springs","Estero"]'::jsonb,'["33901","33903","33904","33905","33907","33908","33909","33912","33913","33914","33916","33917","33919","33928","33935","33936","33965","33966","33967","33971","33972","33973","33974","33976","33990","33991","33993","34134","34135"]'::jsonb,false,'manual',
'Recogida de paquetes a domicilio','Gratis en Lehigh Acres; otras ciudades cubiertas: $25 previa confirmación'
from public.stores where slug='luxury-travel-point' and is_active=true
on conflict (store_id) do nothing;