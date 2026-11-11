-- Dedicated administrative role: can only assign a delivery staff member.
alter table public.store_users drop constraint store_users_role_check;
alter table public.store_users add constraint store_users_role_check
  check (role in ('OWNER','ADMIN','OPERATIONS','BILLER','DISPATCHER','DRIVER','VIEWER','ASSIGNER','SHIPPING_CATALOG'));

create or replace function private.shipping_assignment_only()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (select 1 from public.store_users where user_id = auth.uid() and role in ('ASSIGNER','SHIPPING_CATALOG'))
    and not exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin' and active);
$$;
revoke all on function private.shipping_assignment_only() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.shipping_assignment_only() to authenticated;

-- Existing broad legacy policies must not give this new role unrestricted writes.
drop policy shipments_assigner_scope on public.shipments;
create policy shipments_assigner_scope on public.shipments as restrictive for all to authenticated
using (not (select private.shipping_assignment_only()) or (
  deleted_at is null and exists (
    select 1 from public.store_users m join public.profiles p on p.id = m.user_id
    join public.stores s on s.id = m.store_id
    where m.user_id = auth.uid() and m.store_id = shipments.store_id
      and m.role in ('ASSIGNER','SHIPPING_CATALOG') and m.active and p.active and s.is_active and s.module_shipping_enabled
  )
))
with check (not (select private.shipping_assignment_only()) or (
  deleted_at is null and exists (
    select 1 from public.store_users m join public.profiles p on p.id = m.user_id
    join public.stores s on s.id = m.store_id
    where m.user_id = auth.uid() and m.store_id = shipments.store_id
      and m.role in ('ASSIGNER','SHIPPING_CATALOG') and m.active and p.active and s.is_active and s.module_shipping_enabled
  )
));
create or replace function private.guard_shipment_assignment_only()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_driver public.staff_users%rowtype; v_store uuid;
begin
  if not private.shipping_assignment_only() then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  if tg_op <> 'UPDATE' then raise exception 'Tu rol solo permite asignar repartidores.' using errcode='42501'; end if;
  v_store := old.store_id;
  if not exists (
    select 1 from public.store_users m join public.profiles p on p.id=m.user_id
      join public.stores s on s.id=m.store_id
    where m.user_id=auth.uid() and m.store_id=v_store and m.role in ('ASSIGNER','SHIPPING_CATALOG')
      and m.active and p.active and s.is_active and s.module_shipping_enabled
  ) or old.deleted_at is not null then
    raise exception 'No tienes acceso a este envío.' using errcode='42501';
  end if;
  if (to_jsonb(new) - array['assigned_staff_id','assigned_driver_id','assigned_driver_name','updated_at'])
    is distinct from (to_jsonb(old) - array['assigned_staff_id','assigned_driver_id','assigned_driver_name','updated_at']) then
    raise exception 'Solo puedes cambiar el repartidor del envío.' using errcode='42501';
  end if;
  if new.assigned_staff_id is null then
    if new.assigned_driver_id is not null or new.assigned_driver_name is not null then
      raise exception 'Selecciona un repartidor válido.' using errcode='42501';
    end if;
  else
    select * into v_driver from public.staff_users
      where id=new.assigned_staff_id and store_id=v_store and role='DELIVERY' and status='ACTIVE';
    if not found or new.assigned_driver_id is distinct from v_driver.legacy_app_user_id
      or new.assigned_driver_name is distinct from coalesce(nullif(btrim(concat_ws(' ', v_driver.first_name, v_driver.last_name)), ''),v_driver.username) then
      raise exception 'El repartidor no está activo o no pertenece a esta tienda.' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.guard_shipment_assignment_only() from public, anon, authenticated;
create or replace function public.assign_shipment_driver(p_store_id uuid, p_shipment_id text, p_staff_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_legacy uuid; v_name text; v_result jsonb; v_allowed boolean;
begin
  if auth.uid() is null then raise exception 'Inicia sesión para asignar repartidores.' using errcode='42501'; end if;
  select exists (select 1 from public.profiles where id=auth.uid() and active and role='super_admin')
    or exists (select 1 from public.store_users m join public.profiles p on p.id=m.user_id
      join public.stores s on s.id=m.store_id
      where m.user_id=auth.uid() and m.store_id=p_store_id and m.active and p.active
      and s.is_active and s.module_shipping_enabled
      and ((m.role in ('ASSIGNER','SHIPPING_CATALOG')) or
        (coalesce((m.permissions->>'shipping.assign')::boolean, m.role in ('OWNER','ADMIN','OPERATIONS','DISPATCHER'))))) into v_allowed;
  if not v_allowed then raise exception 'No tienes permiso para asignar repartidores.' using errcode='42501'; end if;
  if p_staff_id is not null then
    select legacy_app_user_id,coalesce(nullif(btrim(concat_ws(' ',first_name,last_name)),''),username)
      into v_legacy,v_name from public.staff_users
      where id=p_staff_id and store_id=p_store_id and role='DELIVERY' and status='ACTIVE';
    if not found then raise exception 'El repartidor no está activo o no pertenece a esta tienda.' using errcode='42501'; end if;
  end if;
  update public.shipments set
    assigned_staff_id=p_staff_id,
    assigned_driver_id=v_legacy,
    assigned_driver_name=v_name,
    updated_at=now()
    where id=p_shipment_id and store_id=p_store_id and deleted_at is null
    returning jsonb_build_object('id',id,'assigned_staff_id',assigned_staff_id,
      'assigned_driver_id',assigned_driver_id,'assigned_driver_name',assigned_driver_name) into v_result;
  if v_result is null then raise exception 'Envío no encontrado o sin acceso.' using errcode='42501'; end if;
  return v_result;
end $$;
revoke all on function public.assign_shipment_driver(uuid,text,uuid) from public, anon;
grant execute on function public.assign_shipment_driver(uuid,text,uuid) to authenticated;

create function private.shipping_catalog_can_manage(p_store_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.store_users m
    join public.profiles p on p.id = m.user_id
    join public.stores s on s.id = m.store_id
    where m.user_id = auth.uid() and m.store_id = p_store_id
      and m.role = 'SHIPPING_CATALOG' and m.active and p.active
      and s.is_active and s.module_store_enabled
  );
$$;
revoke all on function private.shipping_catalog_can_manage(uuid) from public, anon;
grant execute on function private.shipping_catalog_can_manage(uuid) to authenticated;

alter policy assignment_only_no_insert on public.products
  with check (not (select private.shipping_assignment_only())
    or (deleted_at is null and private.shipping_catalog_can_manage(store_id)));
alter policy assignment_only_no_update on public.products
  using (not (select private.shipping_assignment_only())
    or (deleted_at is null and private.shipping_catalog_can_manage(store_id)))
  with check (not (select private.shipping_assignment_only())
    or (deleted_at is null and private.shipping_catalog_can_manage(store_id)));

alter policy assignment_only_no_insert on public.inventory_movements
  with check (not (select private.shipping_assignment_only()) or (
    private.shipping_catalog_can_manage(store_id)
    and exists (select 1 from public.products p where p.id = product_id
      and p.store_id = inventory_movements.store_id and p.deleted_at is null)
  ));

alter policy assignment_only_no_insert on public.product_images
  with check (not (select private.shipping_assignment_only()) or exists (
    select 1 from public.products p where p.id = product_id
      and p.deleted_at is null and private.shipping_catalog_can_manage(p.store_id)
  ));
alter policy assignment_only_no_update on public.product_images
  using (not (select private.shipping_assignment_only()) or exists (
    select 1 from public.products p where p.id = product_id
      and p.deleted_at is null and private.shipping_catalog_can_manage(p.store_id)
  ))
  with check (not (select private.shipping_assignment_only()) or exists (
    select 1 from public.products p where p.id = product_id
      and p.deleted_at is null and private.shipping_catalog_can_manage(p.store_id)
  ));
alter policy assignment_only_no_delete on public.product_images
  using (not (select private.shipping_assignment_only()) or exists (
    select 1 from public.products p where p.id = product_id
      and p.deleted_at is null and private.shipping_catalog_can_manage(p.store_id)
  ));

create policy shipping_catalog_storage_insert on storage.objects as restrictive
for insert to authenticated with check (
  not (select private.shipping_assignment_only()) or (bucket_id = 'product-images' and exists (
    select 1 from public.products p where p.id::text = (storage.foldername(name))[1]
      and p.deleted_at is null and private.shipping_catalog_can_manage(p.store_id)
  ))
);
create policy shipping_catalog_storage_update on storage.objects as restrictive
for update to authenticated using (not (select private.shipping_assignment_only()))
with check (not (select private.shipping_assignment_only()));
create policy shipping_catalog_storage_delete on storage.objects as restrictive
for delete to authenticated using (
  not (select private.shipping_assignment_only()) or (bucket_id = 'product-images' and exists (
    select 1 from public.products p where p.id::text = (storage.foldername(name))[1]
      and p.deleted_at is null and private.shipping_catalog_can_manage(p.store_id)
  ))
);

-- Product forms replace quantity tiers using a scoped delete followed by inserts.
alter policy assignment_only_no_insert on public.product_price_tiers
  with check (not (select private.shipping_assignment_only()) or (
    private.shipping_catalog_can_manage(store_id)
    and exists (select 1 from public.products p where p.id = product_id
      and p.store_id = product_price_tiers.store_id and p.deleted_at is null)
  ));
alter policy assignment_only_no_delete on public.product_price_tiers
  using (not (select private.shipping_assignment_only()) or (
    private.shipping_catalog_can_manage(store_id)
    and exists (select 1 from public.products p where p.id = product_id
      and p.store_id = product_price_tiers.store_id and p.deleted_at is null)
  ));
