alter table public.virtual_lockers
  add column identification_country text,
  add column destination_country text,
  add column identity_revision uuid not null default gen_random_uuid();

update public.virtual_lockers
set identification_country = 'US'
where identification_state is not null;

create function public.reset_virtual_locker_verification()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if row(new.customer_name, new.identification, new.identification_country,
         new.identification_state, new.identification_type)
     is distinct from
     row(old.customer_name, old.identification, old.identification_country,
         old.identification_state, old.identification_type) then
    new.identity_revision := gen_random_uuid();
    new.verified_at := null;
    new.verified_by := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.reset_virtual_locker_verification() from public;

create trigger virtual_locker_reset_verification
before update on public.virtual_lockers
for each row execute function public.reset_virtual_locker_verification();
