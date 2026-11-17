-- Delivery changes never change the sale, attribution or inventory ledger.
create function public.lym_update_delivery_status(
 p_store uuid,p_actor uuid,p_order uuid,p_version integer,p_status text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype;
begin
 if not private.lym_actor(p_store,p_actor) then
   raise exception 'Sin permiso.' using errcode='42501';
 end if;
 if p_status is null or p_status not in ('confirmed','in_transit','delivered') then
   raise exception 'Estado de entrega inválido.';
 end if;
 select * into o from public.orders where id=p_order and store_id=p_store for update;
 if not found then raise exception 'Orden no encontrada.'; end if;
 if o.lym_sale_state<>'confirmed' or o.deleted_at is not null then
   raise exception 'Confirma primero la venta para gestionar su entrega.';
 end if;
 if o.status=p_status then return to_jsonb(o); end if;
 if p_version is null or o.lym_version<>p_version then
   raise exception 'La orden cambió. Recarga antes de continuar.';
 end if;
 update public.orders set status=p_status,lym_version=lym_version+1 where id=o.id;
 insert into public.lym_order_events(order_id,store_id,actor_id,action,details)
 values(o.id,p_store,p_actor,'delivery_status',jsonb_build_object('before_status',o.status,'status',p_status));
 select * into o from public.orders where id=p_order;
 return to_jsonb(o);
end $$;
revoke all on function public.lym_update_delivery_status(uuid,uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.lym_update_delivery_status(uuid,uuid,uuid,integer,text) to service_role;
