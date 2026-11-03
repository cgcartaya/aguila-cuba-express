# Phase 1 — tenant access and secret columns
Deploy order:
1. Deploy explicit store and staff projections (this commit).
2. Confirm Vercel production READY at that commit.
3. Capture fresh policies/grants and compare with the phase-0 baseline.
4. Apply the reviewed SQL migration as a single transaction, lock_timeout 5s.
5. Verify permissions and public store reads; monitor payment and staff paths.

Database validation was performed in the isolated phase-0 database:
- owner can update their Economy currency/margin, cannot change SaaS fields or another store;
- VIEWER cannot edit stores or staff;
- superadministrator can create/update stores and list staff across stores;
- staff lists remain scoped to memberships;
- anonymous/browser clients cannot SELECT Stripe credentials or password hashes;
- service_role can still access payment credentials;
- staff_login_v3 accepts the fixture password and rejects a wrong one;
- rollback restores the captured baseline, then reapplying the migration passes regression again.

Rollback: scripts/security/phase1-rollback.sql, EMERGENCY ONLY. It restores known-insecure baseline access and must not be used routinely. Rolling back only the app to a version with SELECT * while keeping column grants will break create/update returning projections.

Limits:
- No credential rotation was performed. Potentially exposed Stripe keys/webhook secrets need coordinated rotation by their account owners.
- Existing legacy staff passwords use SHA-256; migration to a modern password hash/managed authentication remains pending.
- stores still contains publicly readable non-secret administrative/contact fields. Moving private configuration behind authorized APIs remains a follow-up.
- Other tables/RPCs require their own tenant/role audit. Passing these tests does not certify isolation of the entire SaaS.
- Tests use synthetic DB identities/fixtures; not a claim of complete browser E2E or live payment processing.

## Applied and verified in production
Initial commit: b1de2a950b180149f35488ff45d310b1fec06bd6; Vercel dpl_g9qZ5NRnSmc69J3eqGfdEMsKk3FS READY.
Migration 20261103181005 recorded atomically with the permission change.
Public REST store/product reads returned 200; secret/hash reads returned 401 with Postgres code 42501.
Authenticated browser credential access is denied; service_role credential access remains allowed.
No new error/fatal runtime logs in the initial observation window. This is a short observation, not an uptime guarantee.

## Recipe costs follow-up
The public restaurant_recipe_costs view ran with definer privileges. The second migration uses security_invoker and denies anonymous reads.
An explicit superadmin menu_items read policy preserves cost reporting for inactive dishes.
Synthetic owner/superadmin/anonymous tests and rollback/reapply were successful in staging.
