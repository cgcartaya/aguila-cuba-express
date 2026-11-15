create table public.wf_locker_auth_attempts (
  bucket text primary key,
  reset_at timestamptz not null,
  attempts int not null
);
alter table public.wf_locker_auth_attempts enable row level security;
revoke all on public.wf_locker_auth_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.wf_locker_auth_attempts to service_role;

create function public.consume_wf_locker_auth_attempt(bucket_key text, max_attempts int)
returns boolean language plpgsql set search_path = '' as $$
declare
  total int;
begin
  delete from public.wf_locker_auth_attempts where reset_at <= now();
  insert into public.wf_locker_auth_attempts as buckets values (bucket_key, now() + interval '15 minutes', 1)
  on conflict (bucket) do update
    set attempts = buckets.attempts + 1
    where buckets.attempts < max_attempts
  returning attempts into total;
  return total is not null;
end;
$$;
revoke all on function public.consume_wf_locker_auth_attempt(text, int) from public, anon, authenticated;
grant execute on function public.consume_wf_locker_auth_attempt(text, int) to service_role;
