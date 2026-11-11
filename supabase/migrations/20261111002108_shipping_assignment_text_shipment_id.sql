-- Shipment identifiers are text, including legacy non-UUID identifiers.
drop function if exists public.assign_shipment_driver(uuid,uuid,uuid);
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
      and ((m.role='ASSIGNER') or
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
