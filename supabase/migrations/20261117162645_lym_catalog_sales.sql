-- LYM only. No live stock is changed by this migration.
alter table public.orders
  add column lym_sale_state text check (lym_sale_state in ('pending','confirmed','cancelled','legacy')),
  add column lym_origin text check (lym_origin in ('web','manual','legacy')),
  add column lym_created_by uuid references auth.users(id),
  add column lym_confirmed_by uuid references auth.users(id),
  add column lym_confirmed_at timestamptz,
  add column lym_seller_key text,
  add column lym_seller_name text,
  add column lym_version integer not null default 0,
  add column lym_request_key uuid;
create unique index lym_order_request_key on public.orders(store_id,lym_request_key) where lym_request_key is not null;
create index lym_monthly_sales on public.orders(store_id,lym_confirmed_at) where lym_sale_state='confirmed' and deleted_at is null;
update public.orders o set lym_sale_state='legacy',lym_origin='legacy'
from public.stores s where s.id=o.store_id and s.slug='lym';

-- The actual deducted quantities, independent of later combo/catalog changes.
create table public.lym_order_stock (
 order_id uuid not null references public.orders(id),
 product_id uuid not null references public.products(id),
 quantity integer not null check(quantity>0),
 primary key(order_id,product_id)
);
create table public.lym_order_events (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
 store_id uuid not null references public.stores(id), actor_id uuid references auth.users(id),
 action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.lym_order_stock enable row level security;
alter table public.lym_order_events enable row level security;
revoke all on public.lym_order_stock,public.lym_order_events from anon,authenticated;
grant all on public.lym_order_stock,public.lym_order_events to service_role;
alter table public.inventory_movements add column if not exists actor_id uuid references auth.users(id);

create function private.lym_actor(p_store uuid,p_actor uuid,p_owner boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.stores s join public.profiles p on p.id=p_actor
 where s.id=p_store and s.slug='lym' and s.is_active and s.module_store_enabled and p.active
 and (p.role='super_admin' or exists(select 1 from public.store_users m where m.store_id=s.id
 and m.user_id=p.id and m.active and (m.role in ('OWNER','ADMIN') or (not p_owner and m.role='LYM_SALES')))));
$$;
revoke all on function private.lym_actor(uuid,uuid,boolean) from public,anon,authenticated;

-- Only the service-only transactional RPC below may mutate LYM orders and lines.
-- This also closes the legacy public order_items INSERT policy for this tenant.
create function private.guard_lym_order() returns trigger language plpgsql security definer set search_path='' as $$
declare tenant uuid;
begin
 if tg_table_name='orders' then
   tenant := case when tg_op='DELETE' then old.store_id else new.store_id end;
   if tg_op='INSERT' and new.lym_sale_state is null and exists(select 1 from public.stores where id=tenant and slug='lym') then
     new.lym_sale_state:='legacy';new.lym_origin:='legacy';
   end if;
   if tg_op='UPDATE' and old.store_id<>new.store_id and exists(select 1 from public.stores where id=old.store_id and slug='lym') then
     raise exception 'No se puede mover una orden de LYM.';
   end if;
 else
   select store_id into tenant from public.orders where id=case when tg_op='DELETE' then old.order_id else new.order_id end;
   if tg_op='UPDATE' and old.order_id<>new.order_id and exists(select 1 from public.orders o join public.stores s on s.id=o.store_id where o.id in (old.order_id,new.order_id) and s.slug='lym') then raise exception 'No se puede mover una línea de LYM.'; end if;
 end if;
 if exists(select 1 from public.stores where id=tenant and slug='lym')
 and (case when current_setting('role',true)='none' then session_user else current_setting('role',true) end) not in ('postgres','service_role','supabase_admin') then
   raise exception 'Gestiona las solicitudes de LYM desde su panel.' using errcode='42501';
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger guard_lym_order before insert or update or delete on public.orders for each row execute function private.guard_lym_order();
create trigger guard_lym_item before insert or update or delete on public.order_items for each row execute function private.guard_lym_order();

-- Dedicated staff role: no shipping, campaigns, settings or user administration.
alter table public.store_users drop constraint store_users_role_check;
alter table public.store_users add constraint store_users_role_check check(role in ('OWNER','ADMIN','OPERATIONS','BILLER','DISPATCHER','DRIVER','VIEWER','ASSIGNER','SHIPPING_CATALOG','LYM_SALES'));
create function private.guard_lym_membership() returns trigger language plpgsql set search_path='' as $$
begin
 if new.role='LYM_SALES' and not exists(select 1 from public.stores where id=new.store_id and slug='lym') then
 raise exception 'El rol de ventas LYM solo pertenece a LYM.'; end if;
 if new.active and exists(select 1 from public.store_users m where m.user_id=new.user_id and m.active and m.id<>new.id and ((new.role='LYM_SALES' and m.store_id<>new.store_id) or (m.role='LYM_SALES' and m.store_id<>new.store_id))) then
 raise exception 'La cuenta de ventas LYM debe estar limitada exclusivamente a LYM.'; end if;
 return new;
end $$;
create trigger guard_lym_membership before insert or update on public.store_users for each row execute function private.guard_lym_membership();
create function private.lym_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.store_users where user_id=auth.uid() and role='LYM_SALES')
 and not exists(select 1 from public.profiles where id=auth.uid() and active and role='super_admin');
$$;
create function private.lym_staff_store(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.lym_actor(p_store,auth.uid(),false);
$$;
revoke all on function private.lym_staff(),private.lym_staff_store(uuid) from public,anon;
grant execute on function private.lym_staff(),private.lym_staff_store(uuid) to authenticated;
-- Restrictive policies complement existing permissive tenant policies. Default deny
-- every other table, including tables with older public read/write policies.
do $$ declare t record; scope text; writable boolean; begin
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind in ('r','p') and c.relrowsecurity loop
 scope := 'false'; writable := false;
 if t.relname in ('products','categories','inventory_movements','orders','product_price_tiers') then
   scope := case when t.relname='product_price_tiers' then 'private.lym_staff_store(store_id) and exists(select 1 from public.products p where p.id=product_id and p.store_id=product_price_tiers.store_id)' else 'private.lym_staff_store(store_id)' end;
   writable := t.relname in ('products','product_price_tiers');
 elsif t.relname='stores' then scope := 'private.lym_staff_store(id)';
 elsif t.relname='profiles' then scope := 'id=auth.uid()';
 elsif t.relname='store_users' then scope := 'user_id=auth.uid() and private.lym_staff_store(store_id)';
 elsif t.relname='product_images' then
   scope := 'exists(select 1 from public.products p where p.id=product_id and private.lym_staff_store(p.store_id))'; writable := true;
 elsif t.relname='order_items' then scope := 'exists(select 1 from public.orders o where o.id=order_id and private.lym_staff_store(o.store_id))';
 end if;
 execute format('create policy lym_staff_read on public.%I as restrictive for select to authenticated using (not (select private.lym_staff()) or (%s))',t.relname,scope);
 execute format('create policy lym_staff_insert on public.%I as restrictive for insert to authenticated with check (not (select private.lym_staff()) or (%s))',t.relname,case when writable then scope else 'false' end);
 execute format('create policy lym_staff_update on public.%I as restrictive for update to authenticated using (not (select private.lym_staff()) or (%s)) with check (not (select private.lym_staff()) or (%s))',t.relname,case when writable then scope else 'false' end,case when writable then scope else 'false' end);
 execute format('create policy lym_staff_delete on public.%I as restrictive for delete to authenticated using (not (select private.lym_staff()) or (%s))',t.relname,case when t.relname in ('product_images','product_price_tiers') then scope else 'false' end);
 end loop;
end $$;

-- Audit every LYM stock change atomically, including product form edits.
create function private.audit_lym_stock() returns trigger language plpgsql security definer set search_path='' as $$
declare prev integer; actor uuid;
begin
 if not exists(select 1 from public.stores where id=new.store_id and slug='lym') then return new; end if;
 prev:=case when tg_op='INSERT' then 0 else old.stock end;
 if new.stock<0 then raise exception 'Las existencias no pueden ser negativas.'; end if;
 if new.stock=prev then return new; end if;
 actor:=coalesce(nullif(current_setting('lym.actor',true),'')::uuid,auth.uid());
 insert into public.inventory_movements(product_id,store_id,movement_type,quantity,previous_stock,new_stock,reason,notes,created_by_email,actor_id,order_id)
 values(new.id,new.store_id,case when new.stock<prev then 'exit' else 'entry' end,new.stock-prev,prev,new.stock,
 coalesce(nullif(current_setting('lym.reason',true),''),'Edición de producto / existencias'),
 coalesce(current_setting('lym.notes',true),''),(select email from public.profiles where id=actor),actor,nullif(current_setting('lym.order',true),'')::uuid);
 return new;
end $$;
create trigger audit_lym_stock after insert or update of stock on public.products for each row execute function private.audit_lym_stock();

-- Internal needs expansion, validates every product and combo against this tenant.
create function private.lym_needs(p_order uuid,p_store uuid) returns table(product_id uuid,quantity integer)
language sql stable set search_path='' as $$
 select x.product_id,sum(x.quantity)::integer from (
 select i.product_id,i.quantity from public.order_items i where i.order_id=p_order and i.item_type='product'
 union all select c.product_id,c.quantity*i.quantity from public.order_items i join public.combos b on b.id=i.combo_id and b.store_id=p_store
 join public.combo_items c on c.combo_id=b.id where i.order_id=p_order and i.item_type='combo'
 )x group by x.product_id;
$$;
revoke all on function private.lym_needs(uuid,uuid) from public,anon,authenticated;

-- Public mode is callable ONLY by the server service role; prices and attribution
-- are resolved on trusted server/database paths. No actor or price from browser.
create function public.lym_save_order(p_store uuid,p_actor uuid,p_order uuid,p_version integer,p_payload jsonb,p_items jsonb,p_public boolean default false,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; line jsonb; prod public.products%rowtype; combo public.combos%rowtype;
 q integer; price numeric; v_total numeric:=0; name text; pid uuid; cid uuid; seller text; seller_name text; v_id uuid;
begin
 if not exists(select 1 from public.stores where id=p_store and slug='lym' and is_active and module_store_enabled) then raise exception 'Tienda no disponible.'; end if;
 if not p_public and not private.lym_actor(p_store,p_actor) then raise exception 'Sin permiso.' using errcode='42501'; end if;
 if p_public and (p_actor is not null or p_order is not null) then raise exception 'Solicitud inválida.'; end if;
 if p_request is not null then
   perform pg_advisory_xact_lock(hashtextextended(p_store::text||p_request::text,0));
   select * into o from public.orders where store_id=p_store and lym_request_key=p_request;
   if found then return to_jsonb(o); end if;
 end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Selecciona entre 1 y 100 artículos.'; end if;
 if nullif(btrim(p_payload->>'customer_name'),'') is null or nullif(btrim(p_payload->>'customer_phone'),'') is null
 or nullif(btrim(p_payload->>'recipient_name'),'') is null or nullif(btrim(p_payload->>'recipient_phone'),'') is null
 or nullif(btrim(p_payload->>'address'),'') is null then raise exception 'Completa comprador, destinatario, teléfonos y dirección.'; end if;
 if p_order is not null then
   select * into o from public.orders where id=p_order and store_id=p_store for update;
   if not found or o.lym_sale_state is distinct from 'pending' or o.deleted_at is not null then raise exception 'Solo puedes editar una solicitud pendiente.'; end if;
   if o.lym_version<>p_version then raise exception 'La orden cambió. Recarga antes de guardar.'; end if;
   v_id:=o.id;
 else v_id:=gen_random_uuid(); end if;
 seller:=nullif(p_payload->>'seller_key','');
 if p_public then seller:=null; end if;
 if p_order is not null and seller=o.lym_seller_key then
   seller_name:=o.lym_seller_name;
 elsif seller like 'member:%' then
   select display_name into seller_name from public.shareapp_members where id=substring(seller from 8)::uuid and store_id=p_store and active;
 elsif seller like 'user:%' then
   select coalesce(p.full_name,p.email) into seller_name from public.store_users m join public.profiles p on p.id=m.user_id
   where m.store_id=p_store and m.user_id=substring(seller from 6)::uuid and m.active and p.active and m.role in ('OWNER','ADMIN','LYM_SALES');
 elsif seller is not null then raise exception 'Responsable inválido.'; end if;
 if seller is not null and seller_name is null then raise exception 'Responsable no disponible en LYM.'; end if;
 if p_order is null then
   insert into public.orders(id,store_id,order_number,total,address,lym_sale_state,lym_origin,lym_created_by,lym_request_key,stock_restored,payment_method,platform_fixed_fee_amount)
   values(v_id,p_store,'LYM-'||upper(replace(v_id::text,'-','')),0,p_payload->>'address','pending',case when p_public then 'web' else 'manual' end,p_actor,p_request,true,'whatsapp',0);
 else delete from public.order_items where order_id=v_id; end if;
 for line in select value from jsonb_array_elements(p_items) loop
   if coalesce(line->>'quantity','') !~ '^[0-9]+$' then raise exception 'Cantidad inválida.'; end if;
   q:=(line->>'quantity')::integer; if q not between 1 and 100000 then raise exception 'Cantidad inválida.'; end if;
   pid:=null;cid:=null;
   if coalesce(line->>'item_type','product')='product' then
     pid:=(line->>'product_id')::uuid;
     select * into prod from public.products where id=pid and store_id=p_store and is_active and deleted_at is null;
     if not found or (p_public and prod.combo_only) then raise exception 'Producto no disponible.'; end if;
     name:=prod.name;price:=prod.price;
     if p_public then
       if prod.max_quantity_per_order>0 and (select sum((value->>'quantity')::integer) from jsonb_array_elements(p_items) where value->>'product_id'=pid::text)>prod.max_quantity_per_order then raise exception 'Superas el máximo por pedido de %.',prod.name; end if;
       select least(price,coalesce((select min(unit_price) from public.product_price_tiers where product_id=pid and store_id=p_store and min_quantity<=(select sum((value->>'quantity')::integer) from jsonb_array_elements(p_items) where value->>'product_id'=pid::text)),price)) into price;
     end if;
   elsif line->>'item_type'='combo' then
     cid:=(line->>'combo_id')::uuid;
     select * into combo from public.combos where id=cid and store_id=p_store and deleted_at is null and is_active;
     if not found or not exists(select 1 from public.combo_items where combo_id=cid) then raise exception 'Combo no disponible.'; end if;
     name:=combo.name;price:=combo.price;
   else raise exception 'Artículo inválido.'; end if;
   if not p_public then price:=coalesce((line->>'price')::numeric,price); end if;
   if price is null or price<0 or price>1000000 or price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido.'; end if;
   price:=round(price,2); v_total:=v_total+price*q;
   insert into public.order_items(order_id,item_type,product_id,combo_id,product_name,quantity,price,base_price,subtotal)
   values(v_id,case when cid is null then 'product' else 'combo' end,pid,cid,name,q,price,price,price*q);
 end loop;
 if exists(select 1 from private.lym_needs(v_id,p_store)n left join public.products p on p.id=n.product_id and p.store_id=p_store where p.id is null or not p.is_active or p.deleted_at is not null) then raise exception 'El contenido de un combo no está disponible.'; end if;
 update public.orders set customer_name=left(p_payload->>'customer_name',150),customer_phone=left(p_payload->>'customer_phone',40),recipient_name=left(p_payload->>'recipient_name',150),recipient_phone=left(p_payload->>'recipient_phone',40),
 address=left(p_payload->>'address',500),exact_address=left(p_payload->>'address',500),zone_name=left(p_payload->>'delivery_place',150),notes=left(p_payload->>'notes',2000),
 subtotal=v_total,total=v_total+case when p_public then 0 else coalesce((p_payload->>'delivery_fee')::numeric,0) end,
 delivery_fee=case when p_public then 0 else coalesce((p_payload->>'delivery_fee')::numeric,0) end,
 lym_seller_key=case when p_public then lym_seller_key else seller end,lym_seller_name=case when p_public then lym_seller_name else seller_name end,lym_version=lym_version+1
 where id=v_id returning * into o;
 if o.delivery_fee<0 or o.delivery_fee>1000000 then raise exception 'Entrega inválida.'; end if;
 insert into public.lym_order_events(order_id,store_id,actor_id,action,details) values(v_id,p_store,p_actor,case when p_order is null then 'created' else 'edited' end,jsonb_build_object('total',o.total,'seller',o.lym_seller_key));
 return to_jsonb(o);
end $$;
revoke all on function public.lym_save_order(uuid,uuid,uuid,integer,jsonb,jsonb,boolean,uuid) from public,anon,authenticated;
grant execute on function public.lym_save_order(uuid,uuid,uuid,integer,jsonb,jsonb,boolean,uuid) to service_role;

create function public.lym_order_action(p_store uuid,p_actor uuid,p_order uuid,p_action text,p_version integer,p_reason text default '')
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; shortages jsonb; v_needs jsonb;
begin
 if not private.lym_actor(p_store,p_actor) then raise exception 'Sin permiso.' using errcode='42501'; end if;
 select * into o from public.orders where id=p_order and store_id=p_store for update;
 if not found then raise exception 'Orden no encontrada.'; end if;
 -- A retried confirmation is a read, never a second debit.
 if p_action='confirm' and o.lym_sale_state='confirmed' and o.deleted_at is null then return jsonb_build_object('success',true,'id',o.id); end if;
 if p_action in ('cancel','trash') and o.lym_sale_state='cancelled' and (p_action='cancel' or o.deleted_at is not null) then return jsonb_build_object('success',true); end if;
 if o.lym_version<>p_version then raise exception 'La orden cambió. Recarga antes de continuar.'; end if;
 perform set_config('lym.actor',p_actor::text,true);perform set_config('lym.order',o.id::text,true);perform set_config('lym.reason',case when p_action='confirm' then 'Venta confirmada de LYM' when p_action in ('cancel','trash') then 'Cierre / devolución de orden: '||p_reason else p_action||': '||p_reason end,true);perform set_config('lym.notes','Orden '||coalesce(o.order_number,o.id::text),true);
 if o.lym_sale_state='legacy' then
   if p_action not in ('legacy_deducted','legacy_not_deducted') or not private.lym_actor(p_store,p_actor,true) or length(btrim(p_reason))<5 then
     raise exception 'La jefa debe conciliar el inventario histórico y explicar el motivo antes de gestionar esta orden.';
   end if;
   if p_action='legacy_deducted' then
     insert into public.lym_order_stock select o.id,n.product_id,n.quantity from private.lym_needs(o.id,p_store)n;
     if not found then raise exception 'No hay productos históricos para conciliar.'; end if;
   end if;
   update public.orders set lym_sale_state=case when p_action='legacy_deducted' then 'confirmed' else 'pending' end,
    stock_restored=(p_action='legacy_not_deducted'),lym_version=lym_version+1 where id=o.id;
 elsif p_action='confirm' then
   if o.lym_sale_state is distinct from 'pending' or o.deleted_at is not null then raise exception 'Esta solicitud está cerrada.'; end if;
   if not exists(select 1 from public.order_items where order_id=o.id) then raise exception 'La orden no tiene artículos.'; end if;
   if exists(select 1 from public.order_items i where i.order_id=o.id and i.item_type='combo' and not exists(select 1 from public.combos c where c.id=i.combo_id and c.store_id=p_store and c.is_active and c.deleted_at is null and exists(select 1 from public.combo_items ci where ci.combo_id=c.id))) then raise exception 'Un combo ya no está disponible. Revisa sus productos antes de confirmar.'; end if;
   -- Freeze the expanded quantities once. A concurrent combo edit cannot change
   -- the set of rows between locking, validation and debit.
   select jsonb_agg(jsonb_build_object('product_id',n.product_id,'quantity',n.quantity)) into v_needs from private.lym_needs(o.id,p_store)n;
   if v_needs is null then raise exception 'La orden no tiene productos disponibles.'; end if;
   -- Deterministic row locks prevent overselling across different orders.
   perform 1 from public.products p join jsonb_to_recordset(v_needs) as n(product_id uuid,quantity integer) on n.product_id=p.id order by p.id for update of p;
   select jsonb_agg(jsonb_build_object('product_id',n.product_id,'name',coalesce(p.name,'Producto no disponible'),'available',coalesce(p.stock,0),'requested',n.quantity)) into shortages
   from jsonb_to_recordset(v_needs) as n(product_id uuid,quantity integer) left join public.products p on p.id=n.product_id and p.store_id=p_store
   where p.id is null or not p.is_active or p.deleted_at is not null or p.stock<n.quantity;
   if shortages is not null then return jsonb_build_object('success',false,'code','OUT_OF_STOCK','inventory',shortages); end if;
   insert into public.lym_order_stock select o.id,n.product_id,n.quantity from jsonb_to_recordset(v_needs) as n(product_id uuid,quantity integer);
   update public.products p set stock=p.stock-n.quantity from public.lym_order_stock n where n.order_id=o.id and n.product_id=p.id and p.store_id=p_store;
   update public.orders set lym_sale_state='confirmed',status='confirmed',stock_restored=false,platform_fixed_fee_amount=0.30,platform_fee_amount=0.30,lym_confirmed_at=now(),lym_confirmed_by=p_actor,lym_version=lym_version+1 where id=o.id;
 elsif p_action in ('cancel','trash') then
   if length(btrim(p_reason))<3 then raise exception 'Indica el motivo de cierre o devolución.'; end if;
   perform 1 from public.products p join public.lym_order_stock n on n.product_id=p.id where n.order_id=o.id order by p.id for update of p;
   update public.products p set stock=p.stock+n.quantity from public.lym_order_stock n where n.order_id=o.id and n.product_id=p.id and p.store_id=p_store;
   delete from public.lym_order_stock where order_id=o.id;
   update public.orders set lym_sale_state='cancelled',status='cancelled',stock_restored=true,platform_fixed_fee_amount=0,platform_fee_amount=0,deleted_at=case when p_action='trash' then now() else deleted_at end,lym_version=lym_version+1 where id=o.id;
 elsif p_action='restore' then
   if o.lym_sale_state is distinct from 'cancelled' then raise exception 'Solo puedes reabrir órdenes cerradas.'; end if;
   -- Restore is always a new pending request. Explicit confirmation is required.
   update public.orders set lym_sale_state='pending',status='pending',deleted_at=null,stock_restored=true,lym_confirmed_at=null,lym_confirmed_by=null,lym_version=lym_version+1 where id=o.id;
 else raise exception 'Acción inválida.'; end if;
 insert into public.lym_order_events(order_id,store_id,actor_id,action,details) values(o.id,p_store,p_actor,p_action,jsonb_build_object('reason',p_reason,'before',to_jsonb(o)));
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.lym_order_action(uuid,uuid,uuid,text,integer,text) from public,anon,authenticated;
grant execute on function public.lym_order_action(uuid,uuid,uuid,text,integer,text) to service_role;

create function public.lym_adjust_stock(p_store uuid,p_actor uuid,p_product uuid,p_stock integer,p_expected integer,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare current_stock integer;
begin
 if not private.lym_actor(p_store,p_actor) then raise exception 'Sin permiso.' using errcode='42501'; end if;
 if p_stock<0 or length(btrim(p_reason))<3 then raise exception 'Indica existencias válidas y un motivo.'; end if;
 select stock into current_stock from public.products where id=p_product and store_id=p_store for update;
 if not found or current_stock<>p_expected then raise exception 'Las existencias cambiaron. Recarga el producto.'; end if;
 perform set_config('lym.actor',p_actor::text,true);perform set_config('lym.reason',p_reason,true);
 update public.products set stock=p_stock where id=p_product and store_id=p_store;
end $$;
revoke all on function public.lym_adjust_stock(uuid,uuid,uuid,integer,integer,text) from public,anon,authenticated;
grant execute on function public.lym_adjust_stock(uuid,uuid,uuid,integer,integer,text) to service_role;

create function public.lym_monthly_report(p_store uuid,p_actor uuid,p_year integer,p_month integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare from_date timestamptz; to_date timestamptz; result jsonb;
begin
 if not private.lym_actor(p_store,p_actor,true) then raise exception 'Solo la jefa puede consultar el reporte.' using errcode='42501'; end if;
 from_date:=make_date(p_year,p_month,1)::timestamp at time zone 'America/Havana';
 to_date:=(make_date(p_year,p_month,1)+interval '1 month')::timestamp at time zone 'America/Havana';
 select jsonb_build_object('rows',coalesce(jsonb_agg(x),'[]'::jsonb),'orders',(select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'order_number',d.order_number,'seller_key',coalesce(d.lym_seller_key,'unassigned'),'state',d.lym_sale_state,'origin',d.lym_origin,'date',case when d.lym_sale_state='confirmed' then d.lym_confirmed_at else d.created_at end,'total',d.total) order by d.created_at desc),'[]'::jsonb) from public.orders d where d.store_id=p_store and d.deleted_at is null and ((d.lym_sale_state='confirmed' and d.lym_confirmed_at>=from_date and d.lym_confirmed_at<to_date) or (d.lym_sale_state='pending' and d.created_at>=from_date and d.created_at<to_date))),'timezone','America/Havana',
 'legacy_count',(select count(*) from public.orders where store_id=p_store and (lym_sale_state='legacy' or (lym_sale_state='confirmed' and lym_confirmed_at is null)))) into result from (
 select coalesce(o.lym_seller_key,'unassigned') seller_key,coalesce(max(o.lym_seller_name),'Sin atribuir') seller_name,
 count(*) filter(where o.lym_sale_state='pending') pending,
 count(*) filter(where o.lym_sale_state='confirmed') confirmed,
 coalesce(sum(u.units) filter(where o.lym_sale_state='confirmed'),0) units,
 coalesce(sum(o.total) filter(where o.lym_sale_state='confirmed'),0) amount
 from public.orders o left join lateral(select sum(i.quantity) units from public.lym_order_stock i where i.order_id=o.id)u on true
 where o.store_id=p_store and o.deleted_at is null and (
 (o.lym_sale_state='confirmed' and o.lym_confirmed_at>=from_date and o.lym_confirmed_at<to_date) or
 (o.lym_sale_state='pending' and o.created_at>=from_date and o.created_at<to_date))
 group by coalesce(o.lym_seller_key,'unassigned'))x;
 return result;
end $$;
revoke all on function public.lym_monthly_report(uuid,uuid,integer,integer) from public,anon,authenticated;
grant execute on function public.lym_monthly_report(uuid,uuid,integer,integer) to service_role;

create function public.lym_web_request(p_store uuid,p_request uuid,p_payload jsonb,p_items jsonb,p_attribution jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o jsonb; m uuid; name text;
begin
 o:=public.lym_save_order(p_store,null,null,0,p_payload,p_items,true,p_request);
 if p_attribution is not null then
   select member.id,member.display_name into m,name from public.shareapp_members member
   join public.shareapp_links link on link.member_id=member.id and link.store_id=member.store_id
   where member.id=(p_attribution->>'member_id')::uuid and member.store_id=p_store and member.active
   and link.id=(p_attribution->>'link_id')::uuid and link.active
   and (link.campaign_id is null or exists(select 1 from public.shareapp_campaigns c where c.id=link.campaign_id and c.store_id=p_store and c.active));
   if m is not null then
     insert into public.shareapp_order_attributions(order_id,store_id,member_id,link_id,visit_id,referred_at)
     values((o->>'id')::uuid,p_store,m,(p_attribution->>'link_id')::uuid,(p_attribution->>'visit_id')::uuid,(p_attribution->>'referred_at')::timestamptz)
     on conflict(order_id) do nothing;
     if found then update public.orders set lym_seller_key='member:'||m::text,lym_seller_name=name where id=(o->>'id')::uuid; end if;
   end if;
 end if;
 return o;
end $$;
revoke all on function public.lym_web_request(uuid,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.lym_web_request(uuid,uuid,jsonb,jsonb,jsonb) to service_role;

-- Staff may upload/replace only images belonging to LYM products.
create policy lym_staff_storage_insert on storage.objects as restrictive for insert to authenticated
with check(not (select private.lym_staff()) or (bucket_id='product-images' and exists(select 1 from public.products p where p.id::text=(storage.foldername(name))[1] and private.lym_staff_store(p.store_id))));
create policy lym_staff_storage_update on storage.objects as restrictive for update to authenticated
using(not (select private.lym_staff()) or (bucket_id='product-images' and exists(select 1 from public.products p where p.id::text=(storage.foldername(name))[1] and private.lym_staff_store(p.store_id))))
with check(not (select private.lym_staff()) or (bucket_id='product-images' and exists(select 1 from public.products p where p.id::text=(storage.foldername(name))[1] and private.lym_staff_store(p.store_id))));
create policy lym_staff_storage_delete on storage.objects as restrictive for delete to authenticated
using(not (select private.lym_staff()) or (bucket_id='product-images' and exists(select 1 from public.products p where p.id::text=(storage.foldername(name))[1] and private.lym_staff_store(p.store_id))));

-- LYM's stock audit cannot be edited or erased by any store user.
create function private.guard_lym_movement() returns trigger language plpgsql set search_path='' as $$
begin
 if exists(select 1 from public.stores where id=old.store_id and slug='lym') then
   raise exception 'El historial de existencias de LYM es inmutable.' using errcode='42501';
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger guard_lym_movement before update or delete on public.inventory_movements for each row execute function private.guard_lym_movement();

revoke all on function private.guard_lym_membership(),private.audit_lym_stock(),private.guard_lym_movement() from public,anon,authenticated;
revoke all on function private.guard_lym_order() from public,anon,authenticated;

-- ShareAPP keeps its existing response shape. For LYM sales mean confirmed,
-- while other tenants continue using the original paid-order definition.
create or replace function public.shareapp_results(p_store_id uuid, p_member_id uuid default null)
returns table (member_id uuid, display_name text, visits bigint, product_views bigint, orders bigint, paid_orders bigint, paid_total numeric)
language sql stable security invoker set search_path = '' as $$
  with traffic as (
    select e.member_id, count(distinct e.visit_id) visits,
      count(*) filter (where e.kind = 'product_view') product_views
    from public.shareapp_events e
    where e.store_id = p_store_id and e.created_at >= now() - interval '30 days'
      and (p_member_id is null or e.member_id = p_member_id)
    group by e.member_id
  ), sales as (
    select assigned.member_id,count(*) orders,
      count(*) filter(where case when shop.slug='lym' then o.lym_sale_state='confirmed' and o.deleted_at is null and o.lym_confirmed_at is not null
        else o.payment_status='paid' and lower(coalesce(o.status::text,'')) not in ('cancelled','canceled') end) paid_orders,
      coalesce(sum(o.total) filter(where case when shop.slug='lym' then o.lym_sale_state='confirmed' and o.deleted_at is null and o.lym_confirmed_at is not null
        else o.payment_status='paid' and lower(coalesce(o.status::text,'')) not in ('cancelled','canceled') end),0) paid_total
    from public.orders o join public.stores shop on shop.id=o.store_id
    join lateral (
      select a.member_id,a.created_at from public.shareapp_order_attributions a where a.order_id=o.id and a.store_id=o.store_id and shop.slug<>'lym'
      union all select substring(o.lym_seller_key from 8)::uuid,coalesce(o.lym_confirmed_at,o.created_at) where shop.slug='lym' and o.lym_seller_key like 'member:%'
    ) assigned on true
    where o.store_id=p_store_id and assigned.created_at>=now()-interval '30 days'
      and (p_member_id is null or assigned.member_id=p_member_id)
    group by assigned.member_id
  )
  select m.id,m.display_name,coalesce(t.visits,0),coalesce(t.product_views,0),coalesce(s.orders,0),coalesce(s.paid_orders,0),coalesce(s.paid_total,0)
  from public.shareapp_members m
  left join traffic t on t.member_id = m.id
  left join sales s on s.member_id = m.id
  where m.store_id = p_store_id and (p_member_id is null or m.id = p_member_id)
  order by coalesce(s.paid_total,0) desc,m.created_at;
$$;
revoke all on function public.shareapp_results(uuid,uuid) from public,anon,authenticated;
grant execute on function public.shareapp_results(uuid,uuid) to service_role;
create or replace function public.shareapp_campaign_report(p_store_id uuid,p_member_id uuid default null,p_campaign_id uuid default null,p_page integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$
with traffic as (
  select e.link_id,count(distinct e.visit_id)::bigint visits,
    count(*) filter(where e.kind='product_view')::bigint product_views
  from public.shareapp_events e
  where e.store_id=p_store_id and e.created_at>=now()-interval '30 days'
    and (p_member_id is null or e.member_id=p_member_id)
  group by e.link_id
), sales as (
  select a.link_id,count(*)::bigint orders,
    count(*) filter(where case when exists(select 1 from public.stores shop where shop.id=o.store_id and shop.slug='lym') then o.lym_sale_state='confirmed' and o.deleted_at is null and o.lym_confirmed_at is not null and o.lym_seller_key='member:'||a.member_id::text else o.payment_status='paid' and lower(coalesce(o.status::text,'')) not in ('cancelled','canceled') end)::bigint paid_orders,
    coalesce(sum(o.total) filter(where case when exists(select 1 from public.stores shop where shop.id=o.store_id and shop.slug='lym') then o.lym_sale_state='confirmed' and o.deleted_at is null and o.lym_confirmed_at is not null and o.lym_seller_key='member:'||a.member_id::text else o.payment_status='paid' and lower(coalesce(o.status::text,'')) not in ('cancelled','canceled') end),0) paid_total
  from public.shareapp_order_attributions a join public.orders o on o.id=a.order_id and o.store_id=a.store_id
  where a.store_id=p_store_id and (case when exists(select 1 from public.stores shop where shop.id=o.store_id and shop.slug='lym') then coalesce(o.lym_confirmed_at,o.created_at) else a.created_at end)>=now()-interval '30 days'
    and (p_member_id is null or a.member_id=p_member_id)
  group by a.link_id
), metrics as (
  select l.id,l.code,l.campaign_id,c.title campaign_title,l.member_id,m.display_name,l.title,l.network,l.active,l.created_at,
    coalesce(t.visits,0) visits,coalesce(t.product_views,0) product_views,coalesce(s.orders,0) orders,
    coalesce(s.paid_orders,0) paid_orders,coalesce(s.paid_total,0) paid_total
  from public.shareapp_links l
  join public.shareapp_campaigns c on c.id=l.campaign_id and c.store_id=l.store_id
  join public.shareapp_members m on m.id=l.member_id and m.store_id=l.store_id
  left join traffic t on t.link_id=l.id left join sales s on s.link_id=l.id
  where l.store_id=p_store_id and (p_member_id is null or l.member_id=p_member_id)
    and (p_campaign_id is null or l.campaign_id=p_campaign_id)
), campaign_totals as (
  select c.id campaign_id,c.title,c.active,count(x.id)::bigint publications,
    coalesce(sum(x.visits),0) visits,coalesce(sum(x.product_views),0) product_views,
    coalesce(sum(x.orders),0) orders,coalesce(sum(x.paid_orders),0) paid_orders,coalesce(sum(x.paid_total),0) paid_total
  from public.shareapp_campaigns c left join metrics x on x.campaign_id=c.id
  where c.store_id=p_store_id and (p_campaign_id is null or c.id=p_campaign_id)
    and (p_member_id is null or exists(select 1 from metrics z where z.campaign_id=c.id))
  group by c.id
), member_totals as (
  select member_id,display_name,count(*)::bigint publications,sum(visits) visits,sum(product_views) product_views,
    sum(orders) orders,sum(paid_orders) paid_orders,sum(paid_total) paid_total
  from metrics group by member_id,display_name
), detail as (
  select * from metrics order by visits desc,created_at desc,id
  limit 20 offset least(greatest(p_page,0),10000)*20
)
select jsonb_build_object(
  'campaigns',coalesce((select jsonb_agg(to_jsonb(c) order by c.visits desc,c.title) from campaign_totals c),'[]'::jsonb),
  'members',coalesce((select jsonb_agg(to_jsonb(m) order by m.visits desc,m.display_name) from member_totals m),'[]'::jsonb),
  'publications',coalesce((select jsonb_agg(to_jsonb(d) order by d.visits desc,d.created_at desc,d.id) from detail d),'[]'::jsonb),
  'hasMore',(select count(*) from metrics)>(least(greatest(p_page,0),10000)+1)*20,
  'saleBasis',case when exists(select 1 from public.stores where id=p_store_id and slug='lym') then 'confirmed' else 'paid' end,
  'periodDays',30
);
$$;
revoke all on function public.shareapp_campaign_report(uuid,uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.shareapp_campaign_report(uuid,uuid,uuid,integer) to service_role;

-- Legacy SECURITY DEFINER shipping RPCs rely on these broad helpers. The new
-- sales role must not inherit those powers. Catalog access is granted explicitly
-- below instead. Existing roles retain the exact helper behavior.
create or replace function public.has_store_access(p_store_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.store_users membership where membership.store_id=p_store_id and membership.user_id=auth.uid() and membership.active and membership.role<>'LYM_SALES')
 or exists(select 1 from public.profiles profile where profile.id=auth.uid() and profile.active and profile.role='super_admin');
$$;
create or replace function public.user_has_store_access(target_store_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select public.is_super_admin() or exists(select 1 from public.store_users su join public.profiles p on p.id=su.user_id where su.user_id=auth.uid() and su.store_id=target_store_id and su.active and p.active and su.role<>'LYM_SALES');
$$;
create policy lym_staff_product_select on public.products for select to authenticated using(private.lym_staff() and private.lym_staff_store(store_id));
create policy lym_staff_product_insert on public.products for insert to authenticated with check(private.lym_staff() and private.lym_staff_store(store_id));
create policy lym_staff_product_update on public.products for update to authenticated using(private.lym_staff() and private.lym_staff_store(store_id)) with check(private.lym_staff() and private.lym_staff_store(store_id));
create policy lym_staff_category_select on public.categories for select to authenticated using(private.lym_staff() and private.lym_staff_store(store_id));
create policy lym_staff_inventory_select on public.inventory_movements for select to authenticated using(private.lym_staff() and private.lym_staff_store(store_id));
create policy lym_staff_store_select on public.stores for select to authenticated using(private.lym_staff() and private.lym_staff_store(id));
create policy lym_staff_tiers on public.product_price_tiers for all to authenticated using(private.lym_staff() and private.lym_staff_store(store_id)) with check(private.lym_staff() and private.lym_staff_store(store_id));
create policy lym_staff_images on public.product_images for all to authenticated
using(private.lym_staff() and exists(select 1 from public.products p where p.id=product_id and private.lym_staff_store(p.store_id)))
with check(private.lym_staff() and exists(select 1 from public.products p where p.id=product_id and private.lym_staff_store(p.store_id)));
create policy lym_staff_image_storage on storage.objects for all to authenticated
using(private.lym_staff() and bucket_id='product-images' and exists(select 1 from public.products p where p.id::text=(storage.foldername(name))[1] and private.lym_staff_store(p.store_id)))
with check(private.lym_staff() and bucket_id='product-images' and exists(select 1 from public.products p where p.id::text=(storage.foldername(name))[1] and private.lym_staff_store(p.store_id)));

-- Middleware checks only the current caller's restriction, with its validated
-- JWT. This exposes no membership list and grants no administrative capability.
create function public.lym_api_limited() returns boolean language sql stable security invoker set search_path='' as $$
 select private.lym_staff();
$$;
revoke all on function public.lym_api_limited() from public,anon;
grant execute on function public.lym_api_limited() to authenticated;
