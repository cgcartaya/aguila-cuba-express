alter table public.order_items
  add column xpress_fruit_unit_lb numeric check (xpress_fruit_unit_lb > 0),
  add column xpress_purchased_quantity integer not null default 0
    check (xpress_purchased_quantity between 0 and quantity);

alter table public.orders add column xpress_market_revision integer not null default 0;

-- Recover the original presentations for orders placed before the snapshot existed.
update public.order_items i
set xpress_fruit_unit_lb = case p.weight_unit
  when 'kg' then p.weight / 0.45359237 when 'g' then p.weight / 453.59237 else p.weight end
from public.orders o, public.products p, public.stores s
where o.id = i.order_id and s.id = o.store_id and s.slug = 'xpress'
  and p.store_id = s.id and p.id = i.product_id and i.item_type = 'product'
  and lower(btrim(p.category)) = 'frutas frescas' and p.weight > 0;

create index xpress_market_order_items on public.order_items (order_id)
where xpress_fruit_unit_lb is not null;

create table public.xpress_market_adjustments (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  before_total numeric not null,
  after_total numeric not null,
  removed jsonb not null,
  refund_due numeric not null default 0 check (refund_due >= 0),
  refunded_at timestamptz,
  refunded_by uuid
);
create index xpress_market_adjustments_order on public.xpress_market_adjustments (order_id);
alter table public.xpress_market_adjustments enable row level security;
revoke all on public.xpress_market_adjustments from public, anon, authenticated;

create function private.can_manage_xpress_market(p_store uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.stores s
    join public.profiles p on p.id = auth.uid() and p.active
    where s.id = p_store and s.slug = 'xpress' and s.is_active
      and (p.role = 'super_admin' or exists (
        select 1 from public.store_users u
        where u.store_id = s.id and u.user_id = p.id and u.active
          and u.role::text in ('OWNER', 'ADMIN', 'OPERATIONS')
      ))
  );
$$;
revoke all on function private.can_manage_xpress_market(uuid) from public, anon, authenticated;

create function public.xpress_market_orders(p_store uuid, p_order uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.can_manage_xpress_market(p_store) then
    raise exception 'No tienes acceso a las compras de Xpress.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'number', coalesce(o.order_number, o.id::text),
      'status', o.status, 'payment_status', o.payment_status, 'revision', o.xpress_market_revision,
      'customer_name', coalesce(o.customer_name, c.name),
      'customer_phone', coalesce(o.customer_phone, c.phone),
      'editable', eligible.value, 'total', o.total,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', i.id, 'product_id', i.product_id, 'name', i.product_name,
          'quantity', i.quantity, 'purchased', i.xpress_purchased_quantity, 'unit_lb', i.xpress_fruit_unit_lb
        ) order by i.product_name, i.id)
        from public.order_items i
        where i.order_id = o.id and i.xpress_fruit_unit_lb is not null
      ), '[]'::jsonb),
      'adjustments', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', a.id, 'created_at', a.created_at, 'before_total', a.before_total,
          'after_total', a.after_total, 'removed', a.removed, 'refund_due', a.refund_due,
          'refunded_at', a.refunded_at
        ) order by a.id desc)
        from public.xpress_market_adjustments a where a.order_id = o.id
      ), '[]'::jsonb)
    ) order by o.created_at desc, o.id)
    from public.orders o
    left join public.customers c on c.id = o.customer_id and c.store_id = o.store_id
    cross join lateral (select (
      o.status in ('pending', 'confirmed') and not coalesce(o.stock_restored, false)
      and (o.payment_status = 'paid' or (o.payment_status = 'pending' and o.payment_method = 'whatsapp'))
    ) is true as value) eligible
    where o.store_id = p_store and o.deleted_at is null and o.source_shipment_id is null
      and (
        (p_order is not null and o.id = p_order and (
          exists (select 1 from public.order_items i where i.order_id = o.id and i.xpress_fruit_unit_lb is not null)
          or exists (select 1 from public.xpress_market_adjustments a where a.order_id = o.id)
        ))
        or (p_order is null and (
          (eligible.value and exists (
            select 1 from public.order_items i where i.order_id = o.id
              and i.xpress_fruit_unit_lb is not null and i.xpress_purchased_quantity < i.quantity
          ))
          or exists (select 1 from public.xpress_market_adjustments a where a.order_id = o.id
            and a.refund_due > 0 and a.refunded_at is null)
        ))
      )
  ), '[]'::jsonb);
end;
$$;

create function public.save_xpress_market_order(
  p_store uuid, p_order uuid, p_revision integer, p_items jsonb, p_apply boolean,
  p_expected jsonb default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
<<adjustment>>
declare
  o public.orders;
  changes jsonb;
  removed jsonb;
  restore jsonb;
  pricing jsonb;
  shipping jsonb;
  units_left bigint;
  old_base numeric;
  subtotal numeric;
  discount numeric;
  total numeric;
  refund numeric;
  management numeric;
  fixed_platform numeric;
  platform numeric;
  removed_lb numeric;
  weight numeric;
  billable numeric;
  rate numeric;
  delivery numeric;
  result jsonb;
begin
  if not private.can_manage_xpress_market(p_store) then
    raise exception 'No tienes acceso a las compras de Xpress.' using errcode = '42501';
  end if;

  select * into o from public.orders
    where id = p_order and store_id = p_store and deleted_at is null and source_shipment_id is null
    for update;
  if not found or o.status is null or o.status not in ('pending', 'confirmed') or coalesce(o.stock_restored, false)
    or not coalesce(o.payment_status = 'paid' or (o.payment_status = 'pending' and o.payment_method = 'whatsapp'), false) then
    raise exception 'La orden ya no está disponible para ajustar. Revisa su estado y el pago.';
  end if;
  if o.xpress_market_revision is distinct from p_revision then
    raise exception 'La orden cambió. Actualiza la lista para ver las cantidades vigentes.';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 200 then
    raise exception 'Selecciona las frutas que deseas actualizar.';
  end if;

  select jsonb_agg(jsonb_build_object(
    'id', i.id, 'product_id', i.product_id, 'name', i.product_name,
    'quantity', x.quantity, 'purchased', x.purchased,
    'removed', i.quantity - x.quantity, 'unit_lb', i.xpress_fruit_unit_lb,
    'unit_platform', i.platform_fee_amount / i.quantity
  )) into changes
  from jsonb_to_recordset(p_items) x(id uuid, quantity integer, purchased integer)
  join public.order_items i on i.id = x.id and i.order_id = o.id and i.xpress_fruit_unit_lb is not null
  where x.quantity between i.xpress_purchased_quantity and i.quantity
    and x.purchased between i.xpress_purchased_quantity and x.quantity;
  if changes is null or jsonb_array_length(changes) <> jsonb_array_length(p_items) or
    (select count(distinct x->>'id') from jsonb_array_elements(changes) x) <> jsonb_array_length(changes) then
    raise exception 'La cantidad solicitada debe incluir las frutas que ya compraste.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('name', x->>'name', 'quantity', x->'removed') order by x->>'name', x->>'id'), '[]'::jsonb),
    jsonb_agg(jsonb_build_object('product_id', x->'product_id', 'quantity', x->'removed', 'order_id', o.id)),
    coalesce(sum((x->>'removed')::numeric * (x->>'unit_lb')::numeric), 0)
  into removed, restore, removed_lb
  from jsonb_array_elements(changes) x where (x->>'removed')::integer > 0;

  shipping := o.shipping_details;
  weight := (shipping->>'weight_lb')::numeric;
  delivery := o.delivery_fee;
  subtotal := o.subtotal;
  discount := coalesce(o.discount_amount, 0);
  management := coalesce(o.customer_management_fee, 0);
  fixed_platform := coalesce(o.platform_fixed_fee_amount, 0);
  platform := o.platform_fee_amount;
  total := o.total;
  refund := 0;
  select coalesce(sum(coalesce(x.quantity, i.quantity)), 0),
    coalesce(sum(case when x.id is null then i.subtotal else round(i.price * x.quantity, 2) end), 0),
    coalesce(sum(case when x.id is null then i.platform_fee_amount
      else round(i.platform_fee_amount / i.quantity * x.quantity, 2) end), 0)
  into units_left, subtotal, platform
  from public.order_items i
  left join jsonb_to_recordset(changes) x(id uuid, quantity integer) on x.id = i.id
  where i.order_id = o.id;

  if removed_lb > 0 then
    old_base := o.subtotal + o.delivery_fee - discount + management;
    if units_left = 0 then
      shipping := null;
      weight := 0;
      delivery := 0;
      discount := 0;
      management := 0;
      fixed_platform := 0;
    else
      pricing := shipping->'xpress_market_rate';
      if pricing is null then
        -- Legacy orders can use the catalog rate only when it reproduces the original quote.
        select jsonb_build_object(
          'rate_per_lb', r.rate_per_lb, 'minimum_weight_lb', r.minimum_weight_lb,
          'minimum_charge', r.minimum_charge, 'fixed_fee', r.fixed_fee,
          'weight_threshold_lb', r.weight_threshold_lb, 'rate_at_or_above_threshold', r.rate_at_or_above_threshold
        ) into pricing from public.shipping_rates r
        where r.store_id = p_store and r.id = (shipping->>'shipping_rate_id')::uuid
          and round(greatest(
            greatest(weight, r.minimum_weight_lb) *
            case when weight >= r.weight_threshold_lb then coalesce(r.rate_at_or_above_threshold, r.rate_per_lb)
              else r.rate_per_lb end + r.fixed_fee, r.minimum_charge
          ), 2) + coalesce((shipping->>'airport_fee_amount')::numeric, 0) = (shipping->>'amount')::numeric;
      end if;
      weight := round(weight - removed_lb, 6);
      if weight is null or weight <= 0 or pricing is null then
        raise exception 'No se pudo reconstruir el peso o la tarifa original del pedido.';
      end if;
      billable := greatest(weight, coalesce((pricing->>'minimum_weight_lb')::numeric, 0));
      rate := case when weight >= (pricing->>'weight_threshold_lb')::numeric
        then coalesce((pricing->>'rate_at_or_above_threshold')::numeric, (pricing->>'rate_per_lb')::numeric)
        else (pricing->>'rate_per_lb')::numeric end;
      delivery := round(greatest(
        billable * rate + coalesce((pricing->>'fixed_fee')::numeric, 0),
        coalesce((pricing->>'minimum_charge')::numeric, 0)
      ), 2) + coalesce((shipping->>'airport_fee_amount')::numeric, 0)
        + (o.delivery_fee - (shipping->>'amount')::numeric);
      shipping := shipping || jsonb_build_object(
        'weight_lb', weight, 'billable_weight_lb', billable, 'rate_per_lb', rate,
        'amount', delivery - (o.delivery_fee - (shipping->>'amount')::numeric),
        'xpress_market_rate', pricing
      );
      discount := least(discount, subtotal + delivery);
    end if;
    total := round(subtotal + delivery - discount + management, 2);
    -- Paid card orders can already include the checkout surcharge in the stored total.
    if o.payment_status = 'paid' and o.payment_method = 'card' and o.total > old_base and old_base > 0 then
      total := total + round(total * (o.total - old_base) / old_base, 2);
    end if;
    if total is null or total < 0 or total > o.total then
      raise exception 'El ajuste produciría un cobro inválido. Revisa la tarifa del pedido.';
    end if;
    if o.payment_status = 'paid' then refund := o.total - total; end if;
  end if;

  result := jsonb_build_object(
    'before_total', o.total, 'after_total', total, 'removed', removed,
    'subtotal', subtotal, 'delivery', delivery, 'discount', discount, 'management', management,
    'weight_lb', weight, 'refund_due', refund, 'cancelled', units_left = 0,
    'payment_status', o.payment_status, 'status', o.status
  );
  if p_apply is not true then return result; end if;
  if result is distinct from p_expected then
    raise exception 'Cambió el cálculo de la orden. Vuelve a revisar el ajuste antes de guardarlo.';
  end if;

  if removed_lb > 0 then
    perform public.restore_product_inventory(p_store, restore);
    insert into public.xpress_market_adjustments(order_id, created_by, before_total, after_total, removed, refund_due)
    values (o.id, auth.uid(), o.total, total, removed, refund);
    delete from public.order_items i using jsonb_to_recordset(changes) x(id uuid, quantity integer)
    where i.id = x.id and i.order_id = o.id and x.quantity = 0;
  end if;

  update public.order_items i
  set quantity = x.quantity, xpress_purchased_quantity = x.purchased,
    subtotal = round(i.price * x.quantity, 2),
    platform_fee_amount = round(x.unit_platform * x.quantity, 2)
  from jsonb_to_recordset(changes) x(id uuid, quantity integer, purchased integer, unit_platform numeric)
  where i.id = x.id and i.order_id = o.id;

  if removed_lb > 0 then
    update public.orders set
      subtotal = adjustment.subtotal, total = adjustment.total,
      delivery_fee = delivery, discount_amount = discount, customer_management_fee = management,
      platform_fee_amount = platform + fixed_platform, platform_fixed_fee_amount = fixed_platform,
      shipping_details = shipping, status = case when units_left = 0 then 'cancelled' else o.status end,
      stock_restored = units_left = 0,
      notes = nullif(concat_ws(E'\n',
        nullif(btrim(regexp_replace(coalesce(o.notes, ''), '^Envío: [^\n]*Peso: [^\n]* lb\. Envío: \$[^\n]*', '', 'n')), ''),
        case when shipping is not null then format('Envío: %s / %s / %s. Peso: %s lb. Envío: $%s',
          shipping->>'service_name', shipping->>'transport_mode', shipping->>'destination', weight,
          round((shipping->>'amount')::numeric, 2)) end
      ), ''),
      xpress_market_revision = o.xpress_market_revision + 1
    where id = o.id;
  else
    update public.orders set xpress_market_revision = o.xpress_market_revision + 1 where id = o.id;
  end if;
  return result;
end;
$$;

create function public.confirm_xpress_market_refund(p_store uuid, p_adjustment bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage_xpress_market(p_store) then
    raise exception 'No tienes acceso a las compras de Xpress.' using errcode = '42501';
  end if;
  update public.xpress_market_adjustments a
  set refunded_at = now(), refunded_by = auth.uid()
  from public.orders o
  where a.id = p_adjustment and a.order_id = o.id and o.store_id = p_store
    and a.refund_due > 0 and a.refunded_at is null;
  if not found then raise exception 'El reembolso ya se registró o no está disponible.'; end if;
end;
$$;

-- Archive under the same order lock used by adjustments, so both operations
-- restore stock from the remaining lines exactly once.
create function public.archive_xpress_market_order(p_store uuid, p_order uuid)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  needs jsonb;
  archived_at timestamptz := now();
begin
  if not private.can_manage_xpress_market(p_store) then
    raise exception 'No tienes acceso a las compras de Xpress.' using errcode = '42501';
  end if;
  select * into o from public.orders
  where id = p_order and store_id = p_store and deleted_at is null and source_shipment_id is null
  for update;
  if not found or (o.payment_status = 'pending' and o.payment_method = 'card') then
    raise exception 'La orden ya no está disponible o el pago sigue pendiente.';
  end if;
  if exists (
    select 1 from public.xpress_market_adjustments a
    where a.order_id = o.id and a.refund_due > 0 and a.refunded_at is null
  ) then
    raise exception 'Registra el reembolso pendiente antes de enviar el pedido a la papelera.';
  end if;
  if not coalesce(o.stock_restored, false) then
    select jsonb_agg(jsonb_build_object(
      'product_id', coalesce(i.product_id, c.product_id),
      'quantity', i.quantity * coalesce(c.quantity, 1),
      'order_id', o.id
    )) into needs
    from public.order_items i
    left join public.combo_items c on i.item_type = 'combo' and c.combo_id = i.combo_id
    where i.order_id = o.id and coalesce(i.product_id, c.product_id) is not null;
    perform public.restore_product_inventory(p_store, needs);
  end if;
  update public.orders set deleted_at = archived_at, stock_restored = true where id = o.id;
  return archived_at;
end;
$$;

revoke all on function public.xpress_market_orders(uuid, uuid),
  public.save_xpress_market_order(uuid, uuid, integer, jsonb, boolean, jsonb),
  public.confirm_xpress_market_refund(uuid, bigint), public.archive_xpress_market_order(uuid, uuid) from public, anon, authenticated;
grant execute on function public.xpress_market_orders(uuid, uuid),
  public.save_xpress_market_order(uuid, uuid, integer, jsonb, boolean, jsonb),
  public.confirm_xpress_market_refund(uuid, bigint), public.archive_xpress_market_order(uuid, uuid) to authenticated;
