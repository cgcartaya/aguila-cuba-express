-- Additive rollout: preserve WF Cargo, leave other companies disabled.
alter table public.stores
  add column module_procedures_enabled boolean not null default false,
  add column procedures_public_enabled boolean not null default false;
update public.stores set module_procedures_enabled = true, procedures_public_enabled = true
where slug = 'wf-cago';

alter table public.procedure_requests
  add column reference text generated always as (id::text) stored,
  add column created_by uuid references public.profiles(id) on delete set null,
  add column origin text not null default 'web' check (origin in ('web','presencial','telefono','whatsapp')),
  add column internal_notes text not null default '' check (length(internal_notes) <= 10000);
create index procedure_requests_chronological on public.procedure_requests (store_id, created_at desc, id);

-- Reuse the existing revision and audit mechanism, including optimistic concurrency.
create or replace function public.procedure_record_change() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.procedure_audit (store_id, request_id, revision, actor_id, event, next_state)
      values (new.store_id, new.id, new.revision,
        new.created_by, 'created', new.state);
  elsif new.revision <> old.revision then
    insert into public.procedure_audit (store_id, request_id, revision, actor_id, event, previous_state, next_state)
      values (new.store_id, new.id, new.revision,
        nullif(current_setting('procedures.actor', true), '')::uuid,
        case when new.state <> old.state then 'state'
             when new.assigned_to is distinct from old.assigned_to then 'assignment'
             when new.internal_notes is distinct from old.internal_notes then 'note'
             else 'verification' end,
        old.state, new.state);
  end if;
  return new;
end;
$$;

create function public.procedure_add_note(p_store uuid, p_request uuid, p_revision integer, p_actor uuid, p_note text)
returns boolean language plpgsql set search_path = '' as $$
begin
  perform set_config('procedures.actor', p_actor::text, true);
  update public.procedure_requests
  set internal_notes = internal_notes || case when internal_notes = '' then '' else E'\n\n' end
      || to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC · ' || p_actor::text || E'\n' || p_note,
      revision = revision + 1
  where store_id = p_store and id = p_request and revision = p_revision
    and state not in ('completed','cancelled') and length(trim(p_note)) between 1 and 2000;
  return found;
end;
$$;
revoke all on function public.procedure_add_note(uuid,uuid,integer,uuid,text) from public, anon, authenticated;
grant execute on function public.procedure_add_note(uuid,uuid,integer,uuid,text) to service_role;

-- Tables remain server-only (RLS enabled with no client policies). The application
-- verifies active profile, tenant membership, module and assignment before using service_role.
-- Deactivation changes flags only and does not touch catalogue or requests.

-- Store owners cannot self-enable a paid module through a direct stores UPDATE.
create function public.procedure_guard_module_flags() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.module_procedures_enabled is distinct from old.module_procedures_enabled
      or new.procedures_public_enabled is distinct from old.procedures_public_enabled)
     and coalesce(auth.jwt()->>'role', '') <> 'service_role'
     and not exists (select 1 from public.profiles where id = auth.uid() and active and role = 'super_admin') then
    raise exception 'Solo el superadministrador puede configurar el módulo de trámites.';
  end if;
  return new;
end;
$$;
create trigger procedure_module_flags before update on public.stores
for each row execute function public.procedure_guard_module_flags();

revoke all on function public.procedure_guard_module_flags() from public, anon, authenticated;
