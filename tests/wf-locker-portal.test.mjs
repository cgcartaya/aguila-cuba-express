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
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from virtual_lockers"), /permission denied/);
    await assert.rejects(db.query("select * from virtual_locker_packages"), /permission denied/);
  } finally {
    await db.close();
  }
});
