create table public.virtual_lockers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  number bigint generated always as identity (start with 1001),
  code text not null,
  customer_name text not null,
  email text not null,
  phone text not null,
  destination text not null,
  identification text not null,
  rules_version text not null,
  accepted_at timestamptz not null default now(),
  verified_by uuid references auth.users(id) on delete set null,
  verified_at timestamptz,
  unique (store_id, code),
  unique (store_id, id)
);
create unique index virtual_lockers_email_unique on public.virtual_lockers (store_id, lower(email));

create table public.virtual_locker_packages (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  locker_id uuid not null,
  tracking text not null,
  weight_lb numeric not null check (weight_lb > 0),
  dimensions text not null,
  received_at timestamptz not null default now(),
  received_by uuid references auth.users(id) on delete set null,
  shipment_reference text,
  dispatched_at timestamptz,
  foreign key (store_id, locker_id) references public.virtual_lockers(store_id, id),
  unique (store_id, tracking)
);

alter table public.virtual_lockers enable row level security;
alter table public.virtual_locker_packages enable row level security;
revoke all on public.virtual_lockers, public.virtual_locker_packages from anon, authenticated;
grant select, insert, update on public.virtual_lockers, public.virtual_locker_packages to service_role;

create function public.assign_virtual_locker_code() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.code := new.code || '-' || new.number::text;
  return new;
end;
$$;
create trigger virtual_locker_assign_code before insert on public.virtual_lockers
for each row execute function public.assign_virtual_locker_code();
