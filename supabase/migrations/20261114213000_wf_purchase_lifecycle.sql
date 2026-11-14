alter table public.virtual_locker_prealerts
 add column dispatched_at timestamptz,
 add column delivered_at timestamptz,
 add column external_tracking text,
 add column external_url text,
 add column invoice_url text,
 add column events jsonb not null default '[]',
 add constraint wf_purchase_dates check (
   (dispatched_at is null or completed_at is not null)
   and (delivered_at is null or dispatched_at is not null));
