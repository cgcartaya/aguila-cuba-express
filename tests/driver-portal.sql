begin;
do $$
declare n integer;
begin
 if has_table_privilege('anon','public.driver_portal_sessions','SELECT') or has_table_privilege('authenticated','public.driver_portal_sessions','INSERT') then raise exception 'Session table exposed'; end if;
 if has_table_privilege('anon','public.driver_portal_login_limits','UPDATE') then raise exception 'Rate table exposed'; end if;
 if has_function_privilege('anon','public.driver_portal_login_attempt(text)','EXECUTE') or has_function_privilege('authenticated','public.driver_portal_login_attempt(text)','EXECUTE') then raise exception 'Rate RPC exposed'; end if;
 if not has_function_privilege('service_role','public.driver_portal_login_attempt(text)','EXECUTE') then raise exception 'Missing server permission'; end if;
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('driver_portal_sessions','driver_portal_login_limits') and c.relrowsecurity)<>2 then raise exception 'Missing RLS'; end if;
 n:=public.driver_portal_login_attempt('unit-test-rollback');
 if n<>1 then raise exception 'First attempt should be 1'; end if;
 n:=public.driver_portal_login_attempt('unit-test-rollback');
 if n<>2 then raise exception 'Attempts must persist atomically'; end if;
 update public.driver_portal_login_limits set expires_at=now()-interval '1 minute' where bucket_key='unit-test-rollback';
 n:=public.driver_portal_login_attempt('unit-test-rollback');
 if n<>1 then raise exception 'Expired limit should reset'; end if;
end;
$$;
rollback;
