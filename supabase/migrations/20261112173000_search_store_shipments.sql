create function public.search_store_shipments(p_store_id uuid, p_search text)
returns setof public.shipments
language sql
stable
security invoker
set search_path = ''
as $$
  with search as (
    select '%' || replace(replace(replace(btrim(p_search), chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' as pattern,
      case when btrim(p_search) ~ '^[+0-9(). -]+$'
        then nullif(regexp_replace(p_search, '[^0-9]', '', 'g'), '') end as phone_digits
    where nullif(btrim(p_search), '') is not null
  )
  select shipment.*
  from public.shipments as shipment
  cross join search
  where shipment.store_id = p_store_id
    and shipment.deleted_at is null
    and (
      shipment.order_number::text ilike search.pattern
      or shipment.package_number::text ilike search.pattern
      or shipment.tracking_code ilike search.pattern
      or shipment.operation_code ilike search.pattern
      or shipment.recipient_name ilike search.pattern
      or shipment.sender_name ilike search.pattern
      or shipment.recipient_phone ilike search.pattern
      or shipment.recipient_phone_alt ilike search.pattern
      or shipment.sender_phone ilike search.pattern
      or shipment.recipient_identity_card ilike search.pattern
      or shipment.recipient_address ilike search.pattern
      or shipment.location ilike search.pattern
      or (search.phone_digits is not null and (
        strpos(regexp_replace(shipment.recipient_phone, '[^0-9]', '', 'g'), search.phone_digits) > 0
        or strpos(regexp_replace(shipment.recipient_phone_alt, '[^0-9]', '', 'g'), search.phone_digits) > 0
        or strpos(regexp_replace(shipment.sender_phone, '[^0-9]', '', 'g'), search.phone_digits) > 0
      ))
      or shipment.trip_id in (
        select trip.id from public.shipping_trips as trip
        where trip.store_id = p_store_id
          and (trip.name ilike search.pattern or trip.trip_number::text ilike search.pattern)
      )
    );
$$;

revoke execute on function public.search_store_shipments(uuid, text) from public, anon;
grant execute on function public.search_store_shipments(uuid, text) to authenticated;
