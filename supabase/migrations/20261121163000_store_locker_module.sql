alter table public.stores
  add column module_lockers_enabled boolean not null default false,
  add column locker_receiving_address text,
  add column locker_whatsapp text;

update public.stores
set module_lockers_enabled = true
where slug = 'wf-cago';

create function public.guard_locker_module_settings() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.module_lockers_enabled is distinct from old.module_lockers_enabled
      or new.locker_receiving_address is distinct from old.locker_receiving_address
      or new.locker_whatsapp is distinct from old.locker_whatsapp)
     and coalesce(auth.jwt()->>'role', '') <> 'service_role'
     and not exists (
       select 1 from public.profiles where id = auth.uid() and active and role = 'super_admin'
     ) then
    raise exception 'Solo el superadministrador puede configurar el módulo de casilleros.';
  end if;
  return new;
end;
$$;

create trigger locker_module_settings before update on public.stores
for each row execute function public.guard_locker_module_settings();

revoke all on function public.guard_locker_module_settings() from public, anon, authenticated;

grant select (module_lockers_enabled, locker_receiving_address, locker_whatsapp)
  on public.stores to anon, authenticated;
grant update (module_lockers_enabled, locker_receiving_address, locker_whatsapp)
  on public.stores to authenticated;
