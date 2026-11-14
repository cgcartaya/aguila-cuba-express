alter table public.virtual_locker_prealerts alter column tracking drop not null,
  add column tracking_url text,
  add column items jsonb,
  add column completed_at timestamptz,
  add unique (store_id, locker_id, id);
alter table public.virtual_locker_packages alter column tracking drop not null,
  add column branch text,
  add column prealert_id uuid,
  add foreign key (store_id, locker_id, prealert_id)
    references public.virtual_locker_prealerts(store_id, locker_id, id);

update public.virtual_locker_packages p set prealert_id=a.id
from public.virtual_locker_prealerts a
where p.store_id=a.store_id and p.locker_id=a.locker_id and p.tracking=a.tracking;
update public.virtual_locker_prealerts a set completed_at=p.received_at
from public.virtual_locker_packages p where p.prealert_id=a.id;

create view public.virtual_locker_directory with (security_invoker=true) as
select l.*, (select count(*) from public.virtual_locker_prealerts a
 where a.store_id=l.store_id and a.locker_id=l.id and a.completed_at is null) as pending_prealerts
from public.virtual_lockers l;
revoke all on public.virtual_locker_directory from public, anon, authenticated;
grant select on public.virtual_locker_directory to service_role;
grant update on public.virtual_locker_prealerts to service_role;
