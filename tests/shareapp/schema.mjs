// Run with SHAREAPP_PGLITE_MODULE=/absolute/path/to/@electric-sql/pglite/dist/index.js node tests/shareapp/schema.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { PGlite } = await import(
  process.env.SHAREAPP_PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create table auth.users(id uuid primary key);
create table public.stores(id uuid primary key);
create table public.orders(id uuid primary key, store_id uuid, payment_status text, status text, total numeric);
grant usage on schema public to anon,authenticated,service_role;
grant all on public.orders,public.stores to service_role;`);
await db.exec(
  readFileSync(
    new URL(
      "../../supabase/migrations/20261017195043_shareapp_gestores.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
await db.exec(
  readFileSync(
    new URL(
      "../../supabase/migrations/20261017202012_shareapp_accounts.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const id = (n) => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
await db.query(`insert into stores values ($1),($2)`, [id(1), id(2)]);
await db.query(`insert into auth.users values ($1)`, [id(3)]);
await db.query(
  `insert into shareapp_members(id,store_id,user_id,display_name) values ($1,$2,$3,'Ana')`,
  [id(4), id(1), id(3)],
);
await db.query(
  `insert into shareapp_links(id,store_id,member_id,code,kind,network,title) values ($1,$2,$3,$4,'store','whatsapp','Prueba')`,
  [id(5), id(1), id(4), "a".repeat(48)],
);
await db.query(
  `insert into orders values ($1,$4,'pending','pending',10),($2,$4,'paid','completed',20),($3,$4,'paid','cancelled',30),($5,$6,'paid','completed',99)`,
  [id(6), id(7), id(8), id(1), id(9), id(2)],
);
for (const orderId of [id(6), id(7), id(8)])
  await db.query(
    `insert into shareapp_order_attributions(order_id,store_id,member_id,link_id,visit_id,referred_at) values ($1,$2,$3,$4,$5,now())`,
    [orderId, id(1), id(4), id(5), id(10)],
  );
await assert.rejects(
  () =>
    db.query(
      `insert into shareapp_order_attributions(order_id,store_id,member_id,link_id,visit_id,referred_at) values ($1,$2,$3,$4,$5,now())`,
      [id(9), id(1), id(4), id(5), id(10)],
    ),
  /mismatch/,
);
await assert.rejects(
  () =>
    db.query(
      `insert into shareapp_order_attributions(order_id,store_id,member_id,link_id,visit_id,referred_at) values ($1,$2,$3,$4,$5,now())`,
      [id(6), id(1), id(4), id(5), id(10)],
    ),
  /duplicate/,
);
await assert.rejects(
  () =>
    db.query(
      `insert into shareapp_links(store_id,member_id,code,kind,network,title) values ($1,$2,$3,'store','whatsapp','Cross-tenant')`,
      [id(2), id(4), "b".repeat(48)],
    ),
  /foreign key/,
);
await db.query(
  `insert into shareapp_events(store_id,member_id,link_id,visit_id,kind,path,event_key) values ($1,$2,$3,$4,'page_view','/','page_view:/')`,
  [id(1), id(4), id(5), id(10)],
);
await db.query(
  `insert into shareapp_events(store_id,member_id,link_id,visit_id,kind,item_id,path,event_key) values ($1,$2,$3,$4,'product_view',$5,'/producto/test','product_view:test')`,
  [id(1), id(4), id(5), id(10), id(11)],
);
await assert.rejects(
  () =>
    db.query(
      `insert into shareapp_events(store_id,member_id,link_id,visit_id,kind,path,event_key) values ($1,$2,$3,$4,'page_view','/','page_view:/')`,
      [id(1), id(4), id(5), id(10)],
    ),
  /duplicate/,
);
let result = await db.query(`select * from shareapp_results($1,null)`, [id(1)]);
assert.equal(Number(result.rows[0].visits), 1);
assert.equal(Number(result.rows[0].product_views), 1);
assert.equal(Number(result.rows[0].orders), 3);
assert.equal(Number(result.rows[0].paid_orders), 1);
assert.equal(Number(result.rows[0].paid_total), 20);
await db.query(`update orders set payment_status='paid' where id=$1`, [id(6)]);
result = await db.query(`select * from shareapp_results($1,$2)`, [
  id(1),
  id(4),
]);
assert.equal(Number(result.rows[0].paid_orders), 2);
assert.equal(Number(result.rows[0].paid_total), 30);
assert.equal(
  (await db.query(`select * from shareapp_results($1,null)`, [id(2)])).rows
    .length,
  0,
);
await db.exec(`set role service_role;`);
assert.equal(
  (await db.query(`select * from shareapp_results($1,null)`, [id(1)])).rows
    .length,
  1,
);
await db.exec(`reset role;`);
for (const role of ["anon", "authenticated"]) {
  await db.exec(`set role ${role}`);
  for (const table of [
    "shareapp_settings",
    "shareapp_members",
    "shareapp_links",
    "shareapp_events",
    "shareapp_order_attributions",
    "shareapp_accounts",
  ]) {
    await assert.rejects(
      () => db.query(`select * from ${table}`),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query(`delete from ${table}`),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query(`insert into ${table} default values`),
      /permission denied/,
    );
    const column =
      table === "shareapp_accounts"
        ? "email"
        : table === "shareapp_settings"
          ? "enabled"
          : table === "shareapp_members" || table === "shareapp_links"
            ? "active"
            : "store_id";
    await assert.rejects(
      () => db.query(`update ${table} set ${column}=${column}`),
      /permission denied/,
    );
  }
  await assert.rejects(
    () => db.query(`select * from shareapp_results($1,null)`, [id(1)]),
    /permission denied/,
  );
  await db.exec("reset role");
}
await db.query(`delete from orders where id=$1`, [id(7)]);
result = await db.query(`select * from shareapp_results($1,null)`, [id(1)]);
assert.equal(Number(result.rows[0].orders), 2);
assert.equal(Number(result.rows[0].paid_total), 10);
console.log(
  "PASS: migration, cross-tenant constraints, deduplication, pending/paid/cancelled/deleted orders, service role and anon/authenticated CRUD denial.",
);
await db.close();
