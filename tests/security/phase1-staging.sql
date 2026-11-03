-- Run ONLY against the isolated phase-0 database. All fixtures roll back.
BEGIN;
INSERT INTO public.staff_users(id,store_id,username,password_hash,role,status,first_name,last_name)
VALUES ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000101','phase1fakea',encode(extensions.digest('fixture-only-password','sha256'),'hex'),'ADMIN','ACTIVE','Fake','A'),
('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000102','phase1fakeb','FAKE_NOT_A_HASH','ADMIN','ACTIVE','Fake','B');
INSERT INTO public.app_users(id,store_id,name,username,password_hash,role)
VALUES('00000000-0000-4000-8000-000000000403','00000000-0000-4000-8000-000000000101','Fake','phase1legacyfake','FAKE_NOT_A_HASH','ADMIN');
UPDATE public.stores SET stripe_direct_secret_key='FAKE_NOT_A_KEY' WHERE id='00000000-0000-4000-8000-000000000101';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000201',true);
DO $$ DECLARE n int; BEGIN
  UPDATE public.stores SET economy_target_margin=25 WHERE id='00000000-0000-4000-8000-000000000101';
  GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Owner economy update failed'; END IF;
  UPDATE public.stores SET economy_target_margin=25 WHERE id='00000000-0000-4000-8000-000000000102';
  GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Cross-store update allowed'; END IF;
  BEGIN
    UPDATE public.stores SET platform_fee_percent=1 WHERE id='00000000-0000-4000-8000-000000000101';
    RAISE EXCEPTION 'Owner changed SaaS-managed fields';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.stores(name,slug) VALUES('Unauthorized','phase1-unauthorized');
    RAISE EXCEPTION 'Owner created a store';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF (SELECT count(*) FROM public.staff_users WHERE username IN ('phase1fakea','phase1fakeb'))<>1 THEN RAISE EXCEPTION 'Staff tenant scope failed'; END IF;
  UPDATE public.staff_users SET first_name='Allowed' WHERE id='00000000-0000-4000-8000-000000000401';
  GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Owner staff update failed'; END IF;
  UPDATE public.staff_users SET first_name='Forbidden' WHERE id='00000000-0000-4000-8000-000000000402';
  GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Cross-store staff update allowed'; END IF;
  BEGIN
    PERFORM password_hash FROM public.staff_users;
    RAISE EXCEPTION 'Owner read staff hashes';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM password_hash FROM public.app_users;
    RAISE EXCEPTION 'Owner read legacy hashes';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM stripe_direct_secret_key FROM public.stores;
    RAISE EXCEPTION 'Owner read Stripe key';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  IF NOT EXISTS(SELECT id FROM public.app_users WHERE username='phase1legacyfake') THEN RAISE EXCEPTION 'Owner legacy listing failed'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000202',true);
DO $$ DECLARE n int; BEGIN
 UPDATE public.stores SET economy_target_margin=10 WHERE id='00000000-0000-4000-8000-000000000101';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Viewer changed economy'; END IF;
 UPDATE public.staff_users SET first_name='Forbidden' WHERE id='00000000-0000-4000-8000-000000000401';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>0 THEN RAISE EXCEPTION 'Viewer edited staff'; END IF;
 IF NOT EXISTS(SELECT id FROM public.staff_users WHERE username='phase1fakea') THEN RAISE EXCEPTION 'Member staff listing failed'; END IF;
END $$;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000203',true);
DO $$ DECLARE n int; BEGIN
 UPDATE public.stores SET name='Super admin allowed' WHERE id='00000000-0000-4000-8000-000000000102';
 GET DIAGNOSTICS n=ROW_COUNT; IF n<>1 THEN RAISE EXCEPTION 'Super update failed'; END IF;
 INSERT INTO public.stores(name,slug) VALUES('Super fixture','phase1-super-fixture');
 IF (SELECT count(*) FROM public.staff_users WHERE username IN ('phase1fakea','phase1fakeb'))<>2 THEN RAISE EXCEPTION 'Super staff listing failed'; END IF;
END $$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF NOT EXISTS(SELECT id,name,slug FROM public.stores WHERE slug='phase0-test-a') THEN RAISE EXCEPTION 'Anonymous catalog resolution failed'; END IF;
 BEGIN PERFORM stripe_direct_secret_key FROM public.stores; RAISE EXCEPTION 'Anon key exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM stripe_direct_webhook_secret FROM public.stores; RAISE EXCEPTION 'Anon webhook exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM password_hash FROM public.app_users; RAISE EXCEPTION 'Anon legacy hash exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM password_hash FROM public.staff_users; RAISE EXCEPTION 'Anon staff hash exposed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF NOT EXISTS(SELECT id FROM public.staff_login_v3('phase1fakea','fixture-only-password')) THEN RAISE EXCEPTION 'APK login broke'; END IF;
 IF EXISTS(SELECT id FROM public.staff_login_v3('phase1fakea','wrong-password')) THEN RAISE EXCEPTION 'Invalid APK password accepted'; END IF;
END $$;

RESET ROLE;
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.stores WHERE stripe_direct_secret_key='FAKE_NOT_A_KEY') THEN RAISE EXCEPTION 'Server payment key access failed'; END IF;
END $$;
ROLLBACK;
