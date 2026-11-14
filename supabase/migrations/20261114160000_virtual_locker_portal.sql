alter table public.virtual_lockers
  add column customer_user_id uuid references auth.users(id) on delete set null,
  add column identification_state text,
  add column identification_type text,
  add column email_normalized text generated always as (lower(email)) stored;

create index virtual_lockers_claim_email
  on public.virtual_lockers (store_id, email_normalized) where customer_user_id is null;

create unique index virtual_lockers_customer_account
  on public.virtual_lockers (store_id, customer_user_id)
  where customer_user_id is not null;

create index virtual_locker_packages_locker_received
  on public.virtual_locker_packages (store_id, locker_id, received_at desc);

alter table public.virtual_lockers
  add column identification_normalized text generated always as
    (upper(regexp_replace(btrim(identification), '[ -]+', '', 'g'))) stored;

create index virtual_lockers_identification_search
  on public.virtual_lockers (store_id, identification_normalized);
