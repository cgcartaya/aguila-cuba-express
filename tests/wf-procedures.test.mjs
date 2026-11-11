import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

test("trámites: aislamiento, auditoría atómica, revisión concurrente y retención", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create table stores(id uuid primary key);
      create table profiles(id uuid primary key);
      insert into stores values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
      insert into profiles values ('00000000-0000-4000-8000-000000000003');
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/20261111140000_wf_procedures.sql", import.meta.url), "utf8"));
    const store = "00000000-0000-4000-8000-000000000001";
    const other = "00000000-0000-4000-8000-000000000002";
    const actor = "00000000-0000-4000-8000-000000000003";
    await db.query("insert into procedure_catalog values ($1,'apostilla',1,'{}',now())", [store]);
    const create = id => db.query(
      "insert into procedure_requests(store_id,service,version,variant,customer_name,phone,email,checklist) values ($1,'apostilla',1,'florida','Cliente Prueba','+17725550100','test@example.com','[]') returning id",
      [id],
    );
    await assert.rejects(create(other), /foreign key/);
    const { rows: [{ id }] } = await create(store);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from procedure_requests"), /permission denied/);
    await assert.rejects(db.query("select procedure_purge()"), /permission denied/);
    await db.exec("reset role");
    const update = (tenant, revision, state) => db.query(
      "select procedure_update($1,$2,$3,$4,$5,null,'[]') as saved", [tenant, id, revision, actor, state],
    );
    assert.equal((await update(other, 0, "review")).rows[0].saved, false);
    assert.equal((await update(store, 0, "review")).rows[0].saved, true);
    assert.equal((await update(store, 0, "pending")).rows[0].saved, false);
    assert.equal((await update(store, 1, "cancelled")).rows[0].saved, true);
    const { rows } = await db.query("select actor_id, event, previous_state, next_state from procedure_audit order by revision");
    assert.deepEqual(rows.map(row => row.next_state), ["new", "review", "cancelled"]);
    assert.equal(rows[1].actor_id, actor);
    assert.equal(rows[2].previous_state, "review");
    await db.query("update procedure_requests set closed_at = now() - interval '91 days' where id = $1", [id]);
    await db.query("select procedure_purge()");
    const after = await db.query("select customer_name, phone, email, whatsapp_opt_in from procedure_requests");
    assert.deepEqual(after.rows[0], { customer_name: null, phone: null, email: null, whatsapp_opt_in: false });
  } finally {
    await db.close();
  }
});
