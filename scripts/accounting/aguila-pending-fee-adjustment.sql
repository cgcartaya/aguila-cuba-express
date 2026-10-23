-- Ajuste autorizado el 2026-10-23: solo órdenes pendientes de liquidar de Águila.
-- No cambia precios, cobros al cliente, order_items ni liquidaciones cerradas.
-- El ajuste de redondeo queda como diferencia auditable entre la comisión total
-- y (comisión registrada en los artículos + fijo), visible en el desglose admin.
-- Reejecución segura: solo actualiza órdenes con fijo 0.30 y sin ajustes previos.
with candidates as (
  select o.id, o.order_number, o.platform_fee_amount as previous_fee,
    sum(coalesce(i.platform_fee_amount, 0)) as line_fee,
    sum(round(round(i.base_price * 1.025, 2) - i.base_price, 2) * i.quantity) as ideal_fee
  from public.orders o
  join public.stores s on s.id = o.store_id
  join public.order_items i on i.order_id = o.id
  where s.slug = 'aguila'
    and o.created_at > (select max(period_end) from public.platform_fee_settlements where store_id = s.id)
    and o.created_at < timestamptz '2026-10-24 00:00:00+00'
    and o.platform_fixed_fee_amount = 0.30
  group by o.id
  having bool_and(i.base_price is not null)
    and o.platform_fee_amount = sum(coalesce(i.platform_fee_amount, 0)) + 0.30
), updated as (
  update public.orders o
    set platform_fixed_fee_amount = 0.50,
        platform_fee_amount = c.line_fee + greatest(c.ideal_fee - c.line_fee, 0) + 0.50
  from candidates c
  where o.id = c.id
  returning o.order_number, c.previous_fee, o.platform_fee_amount as new_fee,
    greatest(c.ideal_fee - c.line_fee, 0) as rounding_adjustment
)
select count(*) as updated_orders, sum(previous_fee) as previous_fee,
  sum(new_fee) as new_fee, sum(rounding_adjustment) as rounding_adjustment,
  sum(new_fee - previous_fee) as total_increase
from updated;
