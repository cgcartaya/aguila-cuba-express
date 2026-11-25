alter table public.luxury_service_folios
  add column payment_status text generated always as (
    case
      when not payment_control then 'unrecorded'
      when paid_cents = 0 then 'pending'
      when paid_cents < total_cents then 'partial'
      else 'paid'
    end
  ) stored;
