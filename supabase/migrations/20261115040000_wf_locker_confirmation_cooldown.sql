create function public.reserve_wf_locker_confirmation(bucket_key text)
returns integer language plpgsql set search_path = '' as $$
declare
  next_send timestamptz;
begin
  insert into public.wf_locker_auth_attempts as buckets (bucket, reset_at, attempts)
    values ('signup:' || bucket_key, now() + interval '60 seconds', 1)
  on conflict (bucket) do update
    set reset_at = excluded.reset_at
    where buckets.reset_at <= now()
  returning reset_at into next_send;

  if found then
    return 0;
  end if;

  select reset_at into next_send from public.wf_locker_auth_attempts
    where bucket = 'signup:' || bucket_key;
  return greatest(1, ceil(extract(epoch from next_send - now()))::integer);
end;
$$;
revoke all on function public.reserve_wf_locker_confirmation(text) from public, anon, authenticated;
grant execute on function public.reserve_wf_locker_confirmation(text) to service_role;
