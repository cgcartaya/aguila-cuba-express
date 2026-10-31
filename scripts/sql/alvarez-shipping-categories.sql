-- Álvarez Travel only. Re-runnable data configuration; preserves service/rate IDs
-- already used by historical shipments and quotes. No schema changes.
BEGIN;
DO $config$
DECLARE
  agency_id uuid;
  cuba_id uuid;
  havana_id uuid;
  service record;
  per_pound numeric;
BEGIN
  SELECT id INTO STRICT agency_id FROM public.stores WHERE subdomain = 'alvarez-travel';
  SELECT id INTO STRICT cuba_id FROM public.shipping_countries
    WHERE store_id = agency_id AND lower(name) = 'cuba' AND is_active;
  SELECT id INTO STRICT havana_id FROM public.shipping_provinces
    WHERE store_id = agency_id AND country_id = cuba_id AND lower(name) = 'la habana' AND is_active;

  INSERT INTO public.shipping_service_types (store_id, code, name, billing_mode, is_active, sort_order)
  VALUES
    (agency_id, 'EXPRESS', 'Express · Misceláneas', 'per_lb', true, 1),
    (agency_id, 'EXPRESS_ESSENTIALS', 'Express · Comida, medicinas y aseo', 'per_lb', true, 2),
    (agency_id, 'REGULAR', 'Regular · Cualquier contenido', 'per_lb', true, 3)
  ON CONFLICT (store_id, code) DO UPDATE
    SET name = EXCLUDED.name, billing_mode = EXCLUDED.billing_mode,
        is_active = true, sort_order = EXCLUDED.sort_order, updated_at = now();

  FOR service IN SELECT id, code FROM public.shipping_service_types
    WHERE store_id = agency_id AND code IN ('EXPRESS', 'EXPRESS_ESSENTIALS', 'REGULAR')
  LOOP
    per_pound := CASE service.code WHEN 'EXPRESS' THEN 6 WHEN 'EXPRESS_ESSENTIALS' THEN 5 ELSE 3 END;
    -- Ensure every category has a country-wide rate.
    INSERT INTO public.shipping_rates
      (store_id, service_type_id, scope_type, country_id, transport_mode, rate_per_lb,
       minimum_weight_lb, estimated_days_min, estimated_days_max)
    SELECT agency_id, service.id, 'country', cuba_id, 'air', per_pound, 10,
           CASE WHEN service.code = 'REGULAR' THEN 7 ELSE 5 END,
           CASE WHEN service.code = 'REGULAR' THEN 12 ELSE 6 END
    WHERE NOT EXISTS (SELECT 1 FROM public.shipping_rates r
      WHERE r.store_id = agency_id AND r.service_type_id = service.id
        AND r.scope_type = 'country' AND r.country_id = cuba_id AND r.transport_mode = 'air' AND r.is_active);

    IF service.code <> 'REGULAR' THEN
      INSERT INTO public.shipping_rates
        (store_id, service_type_id, scope_type, province_id, transport_mode, rate_per_lb,
         minimum_weight_lb, estimated_days_min, estimated_days_max)
      SELECT agency_id, service.id, 'province', havana_id, 'air', per_pound, 5, 1, 2
      WHERE NOT EXISTS (SELECT 1 FROM public.shipping_rates r
        WHERE r.store_id = agency_id AND r.service_type_id = service.id
          AND r.scope_type = 'province' AND r.province_id = havana_id AND r.transport_mode = 'air' AND r.is_active);
    END IF;

    UPDATE public.shipping_rates r SET
      rate_per_lb = per_pound,
      weight_threshold_lb = NULL, rate_at_or_above_threshold = NULL,
      minimum_weight_lb = CASE WHEN service.code <> 'REGULAR' AND r.province_id = havana_id THEN 5 ELSE 10 END,
      maximum_weight_lb = NULL, minimum_charge = 0, fixed_fee = 0,
      estimated_days_min = CASE WHEN service.code = 'REGULAR' THEN 7 WHEN r.province_id = havana_id THEN 1 ELSE 5 END,
      estimated_days_max = CASE WHEN service.code = 'REGULAR' THEN 12 WHEN r.province_id = havana_id THEN 2 ELSE 6 END,
      updated_at = now()
    WHERE r.store_id = agency_id AND r.service_type_id = service.id AND r.is_active;
  END LOOP;
END
$config$;
COMMIT;
