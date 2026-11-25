alter table public.luxury_service_folios
  add column sender_contact jsonb,
  add column recipient_contacts jsonb not null default '{}';

create function private.snapshot_luxury_folio_contacts()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  select jsonb_build_object('name', new.customer_name, 'phone', c.phone, 'address', c.address)
    into new.sender_contact
    from public.shipping_customers c where c.id = new.customer_id and c.store_id = new.store_id;

  select coalesce(jsonb_object_agg(r.id::text, jsonb_build_object(
    'phone', r.phone, 'name', split_part(x.destination, ' · ', 1),
    'address', case when strpos(x.destination, ' · ') > 0 then substr(x.destination, strpos(x.destination, ' · ') + 3) end
  )), '{}')
    into new.recipient_contacts
    from public.shipping_recipients r
    join lateral (
      select line->>'destination' as destination from jsonb_array_elements(new.lines) line
      where line->>'recipientId' = r.id::text and nullif(line->>'destination', '') is not null
      limit 1
    ) x on true
    where r.store_id = new.store_id;
  return new;
end;
$$;
revoke all on function private.snapshot_luxury_folio_contacts() from public, anon, authenticated;
create trigger snapshot_luxury_folio_contacts before insert on public.luxury_service_folios
  for each row execute function private.snapshot_luxury_folio_contacts();

-- Existing recipients already have their historical name/address within each line.
-- Copy only the current directory phone, identified by the stored recipient ID.
update public.luxury_service_folios f
set sender_contact = (
      select jsonb_build_object('name', f.customer_name, 'phone', c.phone, 'address', c.address)
      from public.shipping_customers c where c.id = f.customer_id and c.store_id = f.store_id
    ),
    recipient_contacts = coalesce((
      select jsonb_object_agg(r.id::text, jsonb_build_object('phone', r.phone))
      from public.shipping_recipients r where r.store_id = f.store_id
        and exists (select 1 from jsonb_array_elements(f.lines) line where line->>'recipientId' = r.id::text)
    ), '{}');
