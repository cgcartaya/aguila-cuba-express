-- Tenant-neutral receipt fallback and public invoice identity allowlist.
-- Preserve existing access rules, signature, totals and document payloads.
CREATE OR REPLACE FUNCTION public.get_public_payment_receipt(p_folio text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_receipt payment_receipts%rowtype;
  v_shipment shipments%rowtype;
  v_store_name text;
  result jsonb;
begin
  select * into v_receipt from payment_receipts where folio = p_folio limit 1;
  if not found then
    return null;
  end if;

  select * into v_shipment from shipments where id = v_receipt.shipment_id limit 1;
  select name into v_store_name from stores where id = v_receipt.store_id limit 1;

  result := jsonb_build_object(
    'receipt', to_jsonb(v_receipt),
    'shipment', to_jsonb(v_shipment),
    'store_name', coalesce(v_store_name, 'Agencia de envíos')
  );

  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_shipping_invoice(p_tracking_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_shipment public.shipments%rowtype;
  v_items jsonb;
  v_store jsonb;
begin
  select *
  into v_shipment
  from public.shipments
  where upper(tracking_code) = upper(trim(p_tracking_code))
    and deleted_at is null
    and public_tracking_enabled = true
  limit 1;

  if v_shipment.id is null then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      to_jsonb(item)
      order by item.sort_order, item.created_at
    ),
    '[]'::jsonb
  )
  into v_items
  from public.shipment_items item
  where item.shipment_id = v_shipment.id
    and item.store_id = v_shipment.store_id;

  select jsonb_build_object(
    'id', store_record.id, 'name', store_record.name, 'slug', store_record.slug,
    'domain', store_record.domain, 'subdomain', store_record.subdomain,
    'logo_url', store_record.logo_url, 'has_landing', store_record.has_landing,
    'module_store_enabled', store_record.module_store_enabled
  )
  into v_store
  from public.stores store_record
  where store_record.id = v_shipment.store_id
  limit 1;

  return jsonb_build_object(
    'shipment',
    to_jsonb(v_shipment)
      - 'created_by'
      - 'updated_by'
      - 'delivery_photo_storage_path',
    'items',
    v_items,
    'store',
    coalesce(v_store, '{}'::jsonb)
  );
end;
$function$;
