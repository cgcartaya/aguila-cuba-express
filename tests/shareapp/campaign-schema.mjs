import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const { PGlite } = await import(
  process.env.SHAREAPP_PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table stores(id uuid primary key);create table orders(id uuid primary key,store_id uuid,payment_status text,status text,total numeric);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);grant usage on schema public to anon,authenticated,service_role;grant select on stores,orders to service_role;`,
);
for (const f of [
  "20261017195043_shareapp_gestores.sql",
  "20261017202012_shareapp_accounts.sql",
  "20261017210037_shareapp_publications.sql",
  "20261018213344_shareapp_poster_campaigns.sql",
])
  await db.exec(
    readFileSync(
      new URL("../../supabase/migrations/" + f, import.meta.url),
      "utf8",
    ),
  );
const id = (n) => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
await db.query("insert into stores values ($1),($2)", [id(1), id(2)]);
await db.query("insert into auth.users values ($1),($2),($3)", [
  id(3),
  id(4),
  id(5),
]);
for (const [m, st, u] of [
  [6, 1, 3],
  [7, 1, 4],
  [8, 2, 5],
])
  await db.query(
    "insert into shareapp_members(id,store_id,user_id,display_name) values($1,$2,$3,$4)",
    [id(m), id(st), id(u), "Gestor " + m],
  );
for (const [c, st] of [
  [9, 1],
  [10, 1],
  [11, 2],
])
  await db.query(
    `insert into shareapp_campaigns(id,store_id,title,body,poster_path,kind) values($1,$2,$3,'Texto',$4,'store')`,
    [id(c), id(st), "Campaña " + c, `${id(st)}/${id(99)}.jpg`],
  );
async function link(n, m, st, c) {
  await db.query(
    `insert into shareapp_links(id,store_id,member_id,code,kind,network,title,campaign_id) values($1,$2,$3,$4,'store','whatsapp','Publicación',$5)`,
    [id(n), id(st), id(m), n.toString(16).padStart(48, "0"), id(c)],
  );
}
await link(12, 6, 1, 9);
await link(13, 7, 1, 9);
await link(14, 6, 1, 10);
await link(15, 8, 2, 11);
for (let i = 30; i < 52; i++) await link(i, 6, 1, 9);
await assert.rejects(() => link(60, 6, 1, 11), /foreign key/);
await assert.rejects(
  () =>
    db.query(
      `insert into shareapp_campaigns(store_id,title,poster_path,kind) values($1,'No',$2,'store')`,
      [id(1), `${id(2)}/${id(99)}.jpg`],
    ),
  /check constraint/,
);
async function event(l, m, st, visit, kind, old = false) {
  await db.query(
    `insert into shareapp_events(store_id,member_id,link_id,visit_id,kind,path,event_key,created_at) values($1,$2,$3,$4,$5,'/tienda',$5,now()-$6::interval)`,
    [id(st), id(m), id(l), id(visit), kind, old ? "31 days" : "0 days"],
  );
}
await event(12, 6, 1, 70, "page_view");
await event(12, 6, 1, 70, "product_view");
await event(13, 7, 1, 71, "page_view");
await event(13, 7, 1, 72, "page_view");
await event(14, 6, 1, 73, "page_view", true);
await event(15, 8, 2, 74, "page_view");
for (const [o, status, pay, total] of [
  [80, "new", "paid", 100],
  [81, "new", "pending", 30],
  [82, "cancelled", "paid", 50],
  [83, "new", "paid", 65],
]) {
  await db.query("insert into orders values($1,$2,$3,$4,$5)", [
    id(o),
    id(1),
    pay,
    status,
    total,
  ]);
  await db.query(
    `insert into shareapp_order_attributions(order_id,store_id,member_id,link_id,visit_id,referred_at) values($1,$2,$3,$4,$5,now())`,
    [id(o), id(1), id(6), id(12), id(70)],
  );
}
await db.query("delete from orders where id=$1", [id(83)]);
async function report(member = null, campaign = null, page = 0) {
  return (
    await db.query("select shareapp_campaign_report($1,$2,$3,$4) as data", [
      id(1),
      member,
      campaign,
      page,
    ])
  ).rows[0].data;
}
const all = await report();
assert.equal(all.campaigns.length, 2);
const c = all.campaigns.find((c) => c.campaign_id === id(9));
assert.equal(Number(c.visits), 3);
assert.equal(Number(c.product_views), 1);
assert.equal(Number(c.paid_orders), 1);
assert.equal(Number(c.paid_total), 100);
assert.equal(Number(c.orders), 3);
assert.equal(Number(c.publications), 24);
assert.equal(all.publications.length, 20);
assert.equal(all.hasMore, true);
assert.equal((await report(null, null, 1)).publications.length, 5);
assert.equal(all.members.length, 2);
const own = await report(id(7));
assert.equal(own.members.length, 1);
assert.equal(Number(own.members[0].visits), 2);
assert.equal(Number(own.members[0].paid_total), 0);
assert.ok(own.publications.every((p) => p.member_id === id(7)));
assert.equal((await report(null, id(11))).publications.length, 0);
await db.query("update shareapp_campaigns set active=false where id=$1", [
  id(9),
]);
assert.equal(Number((await report(null, id(9))).campaigns[0].paid_total), 100);
for (const role of ["anon", "authenticated"]) {
  await db.exec("set role " + role);
  for (const sql of [
    "select * from shareapp_campaigns",
    "delete from shareapp_campaigns",
    "insert into shareapp_campaigns default values",
    "update shareapp_campaigns set active=false",
  ])
    await assert.rejects(() => db.exec(sql), /permission denied/);
  await assert.rejects(() => report(), /permission denied/);
  await db.exec("reset role");
}
await db.exec("set role service_role");
assert.equal((await report()).members.length, 2);
await db.exec("reset role");
console.log(
  "PASS: campaign migration; tenant/poster constraints; anonymous/authenticated denial; invoker report; distinct visits; member/campaign scope; pending/paid/cancelled/deleted sales; pagination with complete totals; paused history.",
);
await db.close();
