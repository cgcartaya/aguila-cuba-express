import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { identificationPattern, validIdentification } from "../lib/lockers/identity.ts";

test("document formats accept separators and distinguish unsupported documents", () => {
  assert.ok(validIdentification("FL", "state_id", "a123-456-78-901-2"));
  assert.ok(validIdentification("CA", "license", "A 1234567"));
  assert.ok(validIdentification("TX", "license", "12345678"));
  assert.equal(validIdentification("FL", "license", "1234567890123"), false);
  assert.equal(validIdentification("FL", "license", "A123.456789012"), false);
  assert.equal(identificationPattern("CA", "state_id"), undefined);
});

test("migration preserves codes, packages, tenant isolation and normalized filters", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key);
      create table stores(id uuid primary key);
      insert into stores values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
      insert into auth.users values ('00000000-0000-4000-8000-000000000003'), ('00000000-0000-4000-8000-000000000004');
    `);
    async function migrate(file) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
    }
    const store = "00000000-0000-4000-8000-000000000001";
    const otherStore = "00000000-0000-4000-8000-000000000002";
    const owner = "00000000-0000-4000-8000-000000000003";
    const otherUser = "00000000-0000-4000-8000-000000000004";
    await migrate("20261113210000_virtual_lockers.sql");
    const insert = (tenant, email) => db.query(`
      insert into virtual_lockers(store_id,code,customer_name,email,phone,destination,identification,rules_version)
      values ($1,'WF','Lucía Pérez',$2,'5550100','Miami, FL','A123-456-78-901-2','WF-2026-11') returning id, code
    `, [tenant, email]);
    const { rows: [legacy] } = await insert(store, "Client@example.com");
    await insert(otherStore, "client@example.com");
    const receive = (tenant, tracking) => db.query(`
      insert into virtual_locker_packages(store_id,locker_id,tracking,weight_lb,dimensions)
      values ($1,$2,$3,2,'10x10x10')
    `, [tenant, legacy.id, tracking]);
    await receive(store, "LEGACY-TRACKING");
    await migrate("20261114160000_virtual_locker_portal.sql");

    const claim = (user, email) => db.query(`
      update virtual_lockers set customer_user_id=$1
      where store_id=$2 and email_normalized=$3 and customer_user_id is null returning id,code
    `, [user, store, email]);
    assert.deepEqual((await claim(otherUser, "other@example.com")).rows, []);
    assert.deepEqual((await claim(owner, "client@example.com")).rows, [legacy]);
    assert.deepEqual((await claim(otherUser, "client@example.com")).rows, []);
    await assert.rejects(insert(store, "CLIENT@EXAMPLE.COM"), /unique constraint/);
    await assert.rejects(receive(otherStore, "WRONG-STORE"), /foreign key/);
    await receive(store, "NEW-TRACKING");
    const packages = user => db.query(`
      select p.tracking from virtual_locker_packages p
      join virtual_lockers l on l.store_id=p.store_id and l.id=p.locker_id
      where l.store_id=$1 and l.customer_user_id=$2 order by p.tracking
    `, [store, user]);
    assert.deepEqual((await packages(owner)).rows, [{ tracking: "LEGACY-TRACKING" }, { tracking: "NEW-TRACKING" }]);
    assert.deepEqual((await packages(otherUser)).rows, []);
    for (const identification of ["A123456789012", "9012"]) {
      const filtered = await db.query(`
        select code,right(identification_normalized,4) as last4 from virtual_lockers
        where store_id=$1 and code ilike $2 and customer_name ilike $3
        and (identification_normalized=$4 or (length($4)=4 and right(identification_normalized,4)=$4))
      `, [store, legacy.code, "%Pérez%", identification]);
      assert.deepEqual(filtered.rows, [{ code: legacy.code, last4: "9012" }]);
    }
    await migrate("20261115010000_wf_locker_international_profile.sql");
    await db.query("update virtual_lockers set verified_at=now(), verified_by=$1 where id=$2", [owner, legacy.id]);
    const { rows: [destinationUpdate] } = await db.query(`
      update virtual_lockers set destination_country='CU', destination='La Habana, Cuba'
      where store_id=$1 and customer_user_id=$2 returning code, verified_at, identity_revision
    `, [store, owner]);
    assert.equal(destinationUpdate.code, legacy.code);
    assert.ok(destinationUpdate.verified_at);
    const { rows: [identityUpdate] } = await db.query(`
      update virtual_lockers set identification_country='CU', identification_type='national_id',
        identification='00123456789'
      where store_id=$1 and customer_user_id=$2 returning code, verified_at, verified_by, identity_revision, identification
    `, [store, owner]);
    assert.equal(identityUpdate.code, legacy.code);
    assert.equal(identityUpdate.identification, "00123456789");
    assert.equal(identityUpdate.verified_at, null);
    assert.equal(identityUpdate.verified_by, null);
    assert.notEqual(identityUpdate.identity_revision, destinationUpdate.identity_revision);
    await migrate("20261114180000_wf_locker_prealerts.sql");
    const prealert = tenant => db.query(`
      insert into virtual_locker_prealerts(store_id,locker_id,tracking,merchant,contents,declared_value)
      values ($1,$2,'NEW-TRACKING','Test Store','Books',10)
    `, [tenant, legacy.id]);
    await prealert(store);
    await assert.rejects(prealert(store), /unique constraint/);
    await assert.rejects(prealert(otherStore), /foreign key/);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from virtual_locker_prealerts"), /permission denied/);
    await assert.rejects(db.query("select * from virtual_lockers"), /permission denied/);
    await assert.rejects(db.query("select * from virtual_locker_packages"), /permission denied/);
  } finally {
    await db.close();
  }
});

test("email requests have a database-backed limit with expiry and independent buckets", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await db.exec(await readFile(new URL("../supabase/migrations/20261115030000_wf_locker_auth_throttle.sql", import.meta.url), "utf8"));
    const tryEmail = async name => (await db.query(
      "select consume_wf_locker_auth_attempt($1, 2) as allowed", [name],
    )).rows[0].allowed;
    assert.equal(await tryEmail("email:a"), true);
    assert.equal(await tryEmail("email:a"), true);
    assert.equal(await tryEmail("email:a"), false);
    assert.equal(await tryEmail("email:b"), true);
    await db.exec("update wf_locker_auth_attempts set reset_at = now() - interval '1 minute' where bucket = 'email:a';");
    assert.equal(await tryEmail("email:a"), true);
    await db.exec(await readFile(new URL("../supabase/migrations/20261115040000_wf_locker_confirmation_cooldown.sql", import.meta.url), "utf8"));
    const reserve = async () => (await db.query(
      "select reserve_wf_locker_confirmation('a') as wait_seconds",
    )).rows[0].wait_seconds;
    const reservations = await Promise.all([reserve(), reserve()]);
    assert.equal(reservations.filter(seconds => seconds === 0).length, 1);
    assert.ok(reservations.some(seconds => seconds > 0 && seconds <= 60));
    await db.exec("update wf_locker_auth_attempts set reset_at = now() where bucket = 'signup:a';");
    assert.equal(await reserve(), 0);
    await db.exec("set role anon;");
    await assert.rejects(tryEmail("email:a"), /permission denied/);
    await assert.rejects(reserve(), /permission denied/);
  } finally {
    await db.close();
  }
});
