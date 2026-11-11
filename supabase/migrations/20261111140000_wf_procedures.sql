create table public.procedure_catalog (
  store_id uuid not null references public.stores(id),
  service text not null,
  version integer not null check (version > 0),
  configuration jsonb not null check (jsonb_typeof(configuration) = 'object'),
  published_at timestamptz,
  primary key (store_id, service, version)
);

create table public.procedure_requests (
  store_id uuid not null,
  id uuid not null default gen_random_uuid(),
  service text not null,
  version integer not null,
  variant text not null,
  customer_name text check (length(customer_name) between 1 and 120),
  phone text check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (length(email) <= 254),
  whatsapp_opt_in boolean not null default false,
  state text not null default 'new' check (state in ('new','pending','review','processing','completed','cancelled')),
  assigned_to uuid references public.profiles(id),
  checklist jsonb not null check (jsonb_typeof(checklist) = 'array'),
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  primary key (store_id, id),
  foreign key (store_id, service, version) references public.procedure_catalog(store_id, service, version)
);

create index procedure_request_queue on public.procedure_requests (store_id, state, created_at desc);
create index procedure_request_assignee on public.procedure_requests (store_id, assigned_to, created_at desc);

create table public.procedure_audit (
  store_id uuid not null,
  request_id uuid not null,
  revision integer not null,
  actor_id uuid references public.profiles(id) on delete set null,
  event text not null,
  previous_state text,
  next_state text,
  created_at timestamptz not null default now(),
  primary key (store_id, request_id, revision),
  foreign key (store_id, request_id) references public.procedure_requests(store_id, id) on delete cascade
);

alter table public.procedure_catalog enable row level security;
alter table public.procedure_requests enable row level security;
alter table public.procedure_audit enable row level security;
revoke all on public.procedure_catalog, public.procedure_requests, public.procedure_audit from anon, authenticated;
grant select, insert, update, delete on public.procedure_catalog, public.procedure_requests, public.procedure_audit to service_role;

create function public.procedure_record_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.procedure_audit (store_id, request_id, revision, event, next_state)
      values (new.store_id, new.id, new.revision, 'created', new.state);
  elsif new.revision <> old.revision then
    insert into public.procedure_audit (store_id, request_id, revision, actor_id, event, previous_state, next_state)
      values (new.store_id, new.id, new.revision,
        nullif(current_setting('procedures.actor', true), '')::uuid,
        case when new.state <> old.state then 'state'
             when new.assigned_to is distinct from old.assigned_to then 'assignment'
             else 'verification' end,
        old.state, new.state);
  end if;
  return new;
end;
$$;

create trigger procedure_request_audit after insert or update on public.procedure_requests
for each row execute function public.procedure_record_change();

create function public.procedure_update(
  p_store uuid, p_request uuid, p_revision integer, p_actor uuid,
  p_state text, p_assignee uuid, p_checklist jsonb
) returns boolean
language plpgsql set search_path = '' as $$
begin
  perform set_config('procedures.actor', p_actor::text, true);
  update public.procedure_requests
  set state = p_state, assigned_to = p_assignee, checklist = p_checklist,
      revision = revision + 1,
      closed_at = case when p_state in ('completed','cancelled') then coalesce(closed_at, now()) end
  where store_id = p_store and id = p_request and revision = p_revision;
  return found;
end;
$$;

revoke all on function public.procedure_update(uuid, uuid, integer, uuid, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.procedure_update(uuid, uuid, integer, uuid, text, uuid, jsonb) to service_role;

create function public.procedure_purge() returns void
language sql set search_path = '' as $$
  update public.procedure_requests
  set customer_name = null, phone = null, email = null, whatsapp_opt_in = false
  where closed_at <= now() - interval '90 days' and customer_name is not null;
  delete from public.procedure_requests where closed_at <= now() - interval '12 months';
  delete from public.procedure_audit where created_at <= now() - interval '12 months';
$$;

revoke all on function public.procedure_purge() from public, anon, authenticated;
grant execute on function public.procedure_purge() to service_role;
