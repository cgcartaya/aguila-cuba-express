alter table public.inventory_movements
  add column if not exists order_id uuid
  references public.orders(id) on delete set null;

create index if not exists inventory_movements_order_id_idx
  on public.inventory_movements(order_id);

create or replace function public.reserve_product_inventory(
  p_store_id uuid,
  p_needs jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  v_requested_count integer;
  v_locked_count integer;
  v_short record;
  v_order_id uuid;
begin
  if p_store_id is null
     or p_needs is null
     or jsonb_typeof(p_needs) <> 'array'
     or jsonb_array_length(p_needs) = 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_REQUEST',
      'message', 'No se recibieron productos para reservar.'
    );
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_needs) as item
    where nullif(item->>'product_id', '') is null
       or coalesce((item->>'quantity')::integer, 0) <= 0
  ) then
    return jsonb_build_object(
      'success', false,
      'code', 'INVALID_REQUEST',
      'message', 'La solicitud de inventario contiene datos inválidos.'
    );
  end if;

  select nullif(item->>'order_id', '')::uuid
    into v_order_id
  from jsonb_array_elements(p_needs) as item
  where nullif(item->>'order_id', '') is not null
  limit 1;

  select count(*)
  into v_requested_count
  from (
    select (item->>'product_id')::uuid as product_id
    from jsonb_array_elements(p_needs) as item
    group by (item->>'product_id')::uuid
  ) requested;

  perform 1
  from public.products as product
  join (
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_needs) as item
    group by (item->>'product_id')::uuid
  ) as need on need.product_id = product.id
  where product.store_id = p_store_id
  order by product.id
  for update of product;

  select count(*)
  into v_locked_count
  from public.products as product
  join (
    select (item->>'product_id')::uuid as product_id
    from jsonb_array_elements(p_needs) as item
    group by (item->>'product_id')::uuid
  ) requested on requested.product_id = product.id
  where product.store_id = p_store_id;

  if v_locked_count <> v_requested_count then
    return jsonb_build_object(
      'success', false,
      'code', 'PRODUCT_UNAVAILABLE',
      'message', 'Uno de los productos ya no está disponible.'
    );
  end if;

  select product.id, product.name, product.stock, need.quantity
  into v_short
  from public.products as product
  join (
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_needs) as item
    group by (item->>'product_id')::uuid
  ) as need on need.product_id = product.id
  where product.store_id = p_store_id
    and product.stock < need.quantity
  order by product.id
  limit 1;

  if found then
    return jsonb_build_object(
      'success', false,
      'code', 'OUT_OF_STOCK',
      'message', format(
        'Stock insuficiente para %s. Disponible: %s.',
        v_short.name,
        v_short.stock
      ),
      'product_id', v_short.id,
      'product_name', v_short.name,
      'available', v_short.stock,
      'requested', v_short.quantity
    );
  end if;

  if v_order_id is not null then
    insert into public.inventory_movements (
      product_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      notes,
      store_id,
      reason,
      order_id
    )
    select
      product.id,
      'exit',
      -need.quantity,
      product.stock,
      product.stock - need.quantity,
      concat(
        'Orden ',
        coalesce(nullif(shop_order.order_number, ''), v_order_id::text),
        coalesce(' · ' || sources.labels, '')
      ),
      p_store_id,
      'Venta automática de tienda online',
      v_order_id
    from public.products as product
    join (
      select
        (item->>'product_id')::uuid as product_id,
        sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_needs) as item
      group by (item->>'product_id')::uuid
    ) as need on need.product_id = product.id
    left join public.orders as shop_order
      on shop_order.id = v_order_id
     and shop_order.store_id = p_store_id
    left join lateral (
      select string_agg(distinct
        case
          when order_item.item_type = 'combo'
            then 'Combo: ' || order_item.product_name
          else 'Producto: ' || order_item.product_name
        end,
        ', '
      ) as labels
      from public.order_items as order_item
      left join public.combo_items as combo_item
        on order_item.item_type = 'combo'
       and combo_item.combo_id = order_item.combo_id
      where order_item.order_id = v_order_id
        and (
          (order_item.item_type = 'product' and order_item.product_id = product.id)
          or
          (order_item.item_type = 'combo' and combo_item.product_id = product.id)
        )
    ) as sources on true
    where product.store_id = p_store_id;
  end if;

  update public.products as product
  set stock = product.stock - need.quantity
  from (
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_needs) as item
    group by (item->>'product_id')::uuid
  ) as need
  where product.id = need.product_id
    and product.store_id = p_store_id;

  return jsonb_build_object('success', true);
end;
$function$;

create or replace function public.restore_product_inventory(
  p_store_id uuid,
  p_needs jsonb
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  v_order_id uuid;
begin
  if p_store_id is null
     or p_needs is null
     or jsonb_typeof(p_needs) <> 'array'
     or jsonb_array_length(p_needs) = 0 then
    return jsonb_build_object('success', true);
  end if;

  select nullif(item->>'order_id', '')::uuid
    into v_order_id
  from jsonb_array_elements(p_needs) as item
  where nullif(item->>'order_id', '') is not null
  limit 1;

  perform 1
  from public.products as product
  join (
    select (item->>'product_id')::uuid as product_id
    from jsonb_array_elements(p_needs) as item
    group by (item->>'product_id')::uuid
  ) requested on requested.product_id = product.id
  where product.store_id = p_store_id
  order by product.id
  for update of product;

  if v_order_id is not null then
    insert into public.inventory_movements (
      product_id,
      movement_type,
      quantity,
      previous_stock,
      new_stock,
      notes,
      store_id,
      reason,
      order_id
    )
    select
      product.id,
      'entry',
      need.quantity,
      product.stock,
      product.stock + need.quantity,
      concat(
        'Orden ',
        coalesce(nullif(shop_order.order_number, ''), v_order_id::text),
        ' · Inventario restaurado automáticamente'
      ),
      p_store_id,
      'Restauración automática de orden',
      v_order_id
    from public.products as product
    join (
      select
        (item->>'product_id')::uuid as product_id,
        sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(p_needs) as item
      group by (item->>'product_id')::uuid
    ) as need on need.product_id = product.id
    left join public.orders as shop_order
      on shop_order.id = v_order_id
     and shop_order.store_id = p_store_id
    where product.store_id = p_store_id;
  end if;

  update public.products as product
  set stock = product.stock + need.quantity
  from (
    select
      (item->>'product_id')::uuid as product_id,
      sum((item->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_needs) as item
    group by (item->>'product_id')::uuid
  ) as need
  where product.id = need.product_id
    and product.store_id = p_store_id;

  return jsonb_build_object('success', true);
end;
$function$;
