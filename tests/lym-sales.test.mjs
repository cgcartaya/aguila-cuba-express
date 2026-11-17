import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
let db;
if (process.env.LYM_TEST_PG_URL) {
  const url = new URL(process.env.LYM_TEST_PG_URL);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.startsWith("/lym_test")
  )
    throw Error(
      "Native SQL tests require a disposable local lym_test database.",
    );
  const pgModule = await import(process.env.LYM_TEST_PG_MODULE || "pg");
  const Client = pgModule.Client || pgModule.default.Client;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  db = {
    query: (sql, args) => client.query(sql, args),
    exec: (sql) => client.query(sql),
    close: () => client.end(),
    async parallelQuery(sql, args) {
      const connection = new Client({ connectionString: url.toString() });
      await connection.connect();
      try {
        return await connection.query(sql, args);
      } finally {
        await connection.end();
      }
    },
  };
} else db = new PGlite();
const store = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002";
const owner = "20000000-0000-4000-8000-000000000001",
  staff = "20000000-0000-4000-8000-000000000002",
  viewer = "20000000-0000-4000-8000-000000000003",
  outsider = "20000000-0000-4000-8000-000000000004";
const p1 = "30000000-0000-4000-8000-000000000001",
  p2 = "30000000-0000-4000-8000-000000000002",
  foreign = "30000000-0000-4000-8000-000000000003";
const combo = "40000000-0000-4000-8000-000000000001",
  member = "50000000-0000-4000-8000-000000000001",
  link = "60000000-0000-4000-8000-000000000001";
const payload = {
  customer_name: "Comprador",
  customer_phone: "+13055550123",
  recipient_name: "Receptor",
  recipient_phone: "+5355550123",
  address: "Calle 1",
  delivery_place: "Casa",
  seller_key: `user:${staff}`,
};
const items = (q = 2, price = 5) => [
  { item_type: "product", product_id: p1, quantity: q, price },
];
async function scalar(sql, args = []) {
  return (await db.query(sql, args)).rows[0]?.result;
}
async function save({
  actor = staff,
  id = null,
  version = 0,
  lines = items(),
  publicMode = false,
  key = crypto.randomUUID(),
  fields = payload,
} = {}) {
  return scalar(
    "select public.lym_save_order($1,$2,$3,$4,$5,$6,$7,$8) result",
    [
      store,
      actor,
      id,
      version,
      JSON.stringify(fields),
      JSON.stringify(lines),
      publicMode,
      key,
    ],
  );
}
async function act(o, action, reason = "Motivo de prueba", actor = staff) {
  const query = db.parallelQuery
    ? db.parallelQuery.bind(db)
    : db.query.bind(db);
  return (
    await query("select public.lym_order_action($1,$2,$3,$4,$5,$6) result", [
      store,
      actor,
      o.id,
      action,
      o.lym_version,
      reason,
    ])
  ).rows[0].result;
}
async function fresh(id) {
  return scalar("select to_jsonb(o) result from public.orders o where id=$1", [
    id,
  ]);
}
async function stock() {
  return scalar("select stock result from public.products where id=$1", [p1]);
}
await db.exec(`
create role anon;create role authenticated;create role service_role;
create schema auth;create schema private;create schema storage;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;
create table auth.users(id uuid primary key);
create table public.stores(id uuid primary key,slug text,name text,is_active boolean default true,module_store_enabled boolean default true);
create table public.profiles(id uuid primary key,email text,full_name text,role text,active boolean default true);
create table public.store_users(id uuid default gen_random_uuid(),store_id uuid,user_id uuid,role text,active boolean default true, constraint store_users_role_check check(role in ('OWNER','VIEWER')));
create table public.products(id uuid primary key default gen_random_uuid(),store_id uuid,name text,stock integer not null default 0,price numeric,is_active boolean default true,deleted_at timestamptz,combo_only boolean default false,max_quantity_per_order integer);
create table public.product_price_tiers(store_id uuid,product_id uuid,min_quantity integer,unit_price numeric);
create table public.categories(id uuid,store_id uuid);
create table public.product_images(id uuid,product_id uuid);
create table public.combos(id uuid primary key,store_id uuid,name text,price numeric,is_active boolean default true,deleted_at timestamptz);
create table public.combo_items(combo_id uuid,product_id uuid,quantity integer);
create table public.orders(id uuid primary key default gen_random_uuid(),store_id uuid,order_number text unique,total numeric not null,address text not null,status text default 'pending',payment_status text default 'pending',payment_method text default 'whatsapp',platform_fixed_fee_amount numeric default .3,platform_fee_amount numeric default 0,stock_restored boolean default false,deleted_at timestamptz,created_at timestamptz default now(),customer_name text,customer_phone text,recipient_name text,recipient_phone text,exact_address text,zone_name text,notes text,subtotal numeric,delivery_fee numeric);
create table public.order_items(id uuid default gen_random_uuid(),order_id uuid,product_id uuid,combo_id uuid,item_type text,product_name text,quantity integer,price numeric,base_price numeric,subtotal numeric);
create table public.inventory_movements(id uuid default gen_random_uuid(),product_id uuid,store_id uuid,movement_type text,quantity integer,previous_stock integer,new_stock integer,reason text,notes text,created_by_email text,order_id uuid,created_at timestamptz default now());
create table public.shareapp_members(id uuid primary key,store_id uuid,user_id uuid,display_name text,active boolean default true);
create table public.shareapp_campaigns(id uuid primary key,store_id uuid,active boolean default true);
create table public.shareapp_links(id uuid primary key,store_id uuid,member_id uuid,campaign_id uuid,active boolean default true);
create table public.shareapp_order_attributions(order_id uuid primary key,store_id uuid,member_id uuid,link_id uuid,visit_id uuid,referred_at timestamptz);
create table storage.objects(id uuid,bucket_id text,name text);
alter table storage.objects enable row level security;
create function public.has_store_access(p_store_id uuid) returns boolean language sql stable security definer as $$ select exists(select 1 from public.store_users where user_id=auth.uid() and store_id=p_store_id and active) $$;
grant usage on schema public,auth,private,storage to authenticated,anon,service_role;
grant execute on function auth.uid() to authenticated,anon;
`);
for (const table of [
  "stores",
  "profiles",
  "store_users",
  "products",
  "product_price_tiers",
  "categories",
  "product_images",
  "orders",
  "order_items",
  "inventory_movements",
  "combos",
  "combo_items",
]) {
  await db.exec(
    `alter table public.${table} enable row level security;create policy existing_policy on public.${table} for all using(true) with check(true);grant all on public.${table} to authenticated,anon;`,
  );
}
await db.query(
  "insert into stores(id,slug,name) values($1,'lym','LYM'),($2,'other','Otra tienda')",
  [store, other],
);
for (const [id, role, s] of [
  [owner, "OWNER", store],
  [staff, "VIEWER", store],
  [viewer, "VIEWER", store],
  [outsider, "OWNER", other],
]) {
  await db.query("insert into auth.users values($1);", [id]);
  await db.query(
    "insert into profiles(id,email,full_name,role) values($1,$2,$3,'store_owner')",
    [id, `${id}@test.local`, role],
  );
  await db.query(
    "insert into store_users(store_id,user_id,role) values($1,$2,$3)",
    [s, id, role],
  );
}
await db.query(
  "insert into products(id,store_id,name,stock,price) values($1,$4,'Producto A',100,10),($2,$4,'Producto B',0,20),($3,$5,'Otro producto',20,50)",
  [p1, p2, foreign, store, other],
);
await db.query(
  "insert into combos(id,store_id,name,price) values($1,$2,'Combo',25);",
  [combo, store],
);
await db.query("insert into combo_items values($1,$2,2)", [combo, p1]);
await db.query(
  "insert into shareapp_members values($1,$2,null,'Gestor sin administración',true)",
  [member, store],
);
await db.query(
  "insert into shareapp_links(id,store_id,member_id) values($1,$2,$3)",
  [link, store, member],
);
await db.exec(`
 alter table public.shareapp_members add column created_at timestamptz default now();
 alter table public.shareapp_order_attributions add column created_at timestamptz default now();
 alter table public.shareapp_links add column code text,add column title text,add column network text,add column created_at timestamptz default now();
 alter table public.shareapp_campaigns add column title text;
 create table public.shareapp_events(link_id uuid,member_id uuid,visit_id uuid,store_id uuid,kind text,created_at timestamptz default now());
`);
await db.exec(
  `create function public.is_super_admin() returns boolean language sql stable security definer as $$select exists(select 1 from public.profiles where id=auth.uid() and active and role='super_admin')$$;`,
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261117162645_lym_catalog_sales.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    "supabase/migrations/20261117222351_lym_order_delivery_status.sql",
    "utf8",
  ),
);
await db.query("update store_users set role='LYM_SALES' where user_id=$1", [
  staff,
]);

await test("web request prices are server-owned, no inventory reservation, attribution is atomic and retry-safe", async () => {
  const before = await stock();
  const key = crypto.randomUUID();
  const args = [
    store,
    key,
    JSON.stringify(payload),
    JSON.stringify(items(2, 0.01)),
    JSON.stringify({
      member_id: member,
      link_id: link,
      visit_id: crypto.randomUUID(),
      referred_at: new Date().toISOString(),
    }),
  ];
  const o = await scalar(
    "select public.lym_web_request($1,$2,$3,$4,$5) result",
    args,
  );
  assert.equal(o.total, 20);
  assert.equal(o.lym_sale_state, "pending");
  assert.equal(o.lym_origin, "web");
  assert.equal(o.lym_created_by, null);
  assert.equal(await stock(), before);
  assert.equal((await fresh(o.id)).lym_seller_key, `member:${member}`);
  assert.equal(
    (await scalar("select public.lym_web_request($1,$2,$3,$4,$5) result", args))
      .id,
    o.id,
  );
  assert.equal(
    await scalar(
      "select count(*)::int result from shareapp_order_attributions where order_id=$1",
      [o.id],
    ),
    1,
  );
});
await test("manual save adjusts prices, captures creator and seller, edit requires current version", async () => {
  const before = await stock();
  let o = await save();
  assert.equal(o.total, 10);
  assert.equal(Number(o.platform_fixed_fee_amount), 0);
  assert.equal(o.lym_created_by, staff);
  assert.equal(o.lym_seller_key, `user:${staff}`);
  assert.equal(await stock(), before);
  const stale = o;
  o = await save({
    id: o.id,
    version: o.lym_version,
    key: null,
    lines: items(3, 7),
  });
  assert.equal(o.total, 21);
  await assert.rejects(
    save({ id: o.id, version: stale.lym_version, key: null }),
    /cambió/,
  );
});
await test("confirmation debits once, duplicate concurrent API requests do not double-debit", async () => {
  const o = await save();
  const before = await stock();
  const results = await Promise.all([
    act(o, "confirm"),
    act(o, "confirm"),
    act(o, "confirm"),
  ]);
  assert(results.every((x) => x.success));
  assert.equal(await stock(), before - 2);
  const confirmed = await fresh(o.id);
  assert.equal(confirmed.lym_confirmed_by, staff);
  assert.equal(Number(confirmed.platform_fixed_fee_amount), 0.3);
  assert(confirmed.lym_confirmed_at);
  assert.equal(
    await scalar(
      "select count(*)::int result from inventory_movements where order_id=$1",
      [o.id],
    ),
    1,
  );
  await assert.rejects(
    save({ id: o.id, key: null, version: confirmed.lym_version }),
    /pendiente/,
  );
});
await test("delivery lifecycle preserves inventory and confirmation; enforces permissions, versions and idempotency", async () => {
  let o = await save();
  const delivery = (order, status, actor = staff, tenant = store) =>
    scalar("select public.lym_update_delivery_status($1,$2,$3,$4,$5) result", [
      tenant,
      actor,
      order.id,
      order.lym_version,
      status,
    ]);
  await assert.rejects(delivery(o, "delivered"), /Confirma primero/);
  await act(o, "confirm");
  o = await fresh(o.id);
  const initial = o,
    beforeStock = await stock();
  const movements = await scalar(
    "select count(*) result from inventory_movements",
  );
  await assert.rejects(delivery(o, "pending"), /inválido/);
  await assert.rejects(delivery(o, "in_transit", outsider), /Sin permiso/);
  await assert.rejects(
    delivery(o, "in_transit", staff, other),
    /Sin permiso|no encontrada/,
  );
  const transit = await delivery(o, "in_transit");
  assert.equal(transit.status, "in_transit");
  assert.equal(
    (await delivery(o, "in_transit")).lym_version,
    transit.lym_version,
  );
  await assert.rejects(delivery(o, "delivered"), /La orden cambió/);
  const delivered = await delivery(transit, "delivered");
  assert.equal(delivered.status, "delivered");
  for (const key of [
    "lym_sale_state",
    "lym_confirmed_at",
    "lym_confirmed_by",
    "lym_seller_key",
    "total",
  ])
    assert.equal(delivered[key], initial[key]);
  assert.equal(await stock(), beforeStock);
  assert.equal(
    await scalar("select count(*) result from inventory_movements"),
    movements,
  );
  assert.equal(
    Number(
      await scalar(
        "select count(*) result from lym_order_events where order_id=$1 and action='delivery_status'",
        [o.id],
      ),
    ),
    2,
  );
  await act(delivered, "cancel");
  assert.equal(await stock(), beforeStock + 2);
  await assert.rejects(
    delivery(await fresh(o.id), "in_transit"),
    /Confirma primero/,
  );
  assert.equal(
    await scalar(
      "select has_function_privilege('authenticated','public.lym_update_delivery_status(uuid,uuid,uuid,integer,text)','execute') result",
    ),
    false,
  );
});

await test("insufficient stock returns all deficient products and leaves order and stock unchanged", async () => {
  const o = await save({
    lines: [
      ...items(100000),
      { item_type: "product", product_id: p2, quantity: 3, price: 20 },
    ],
  });
  const before = await stock();
  const result = await act(o, "confirm");
  assert.equal(result.success, false);
  assert.equal(result.inventory.length, 2);
  assert.equal(await stock(), before);
  assert.equal((await fresh(o.id)).lym_sale_state, "pending");
});
await test("pending cancellation/trash adds nothing, restoration only reopens a request", async () => {
  let o = await save();
  const before = await stock();
  await act(o, "trash");
  assert.equal(await stock(), before);
  o = await fresh(o.id);
  assert(o.deleted_at);
  await act(o, "restore");
  assert.equal(await stock(), before);
  o = await fresh(o.id);
  assert.equal(o.lym_sale_state, "pending");
  assert.equal(o.deleted_at, null);
});
await test("confirmed cancellation restores the actual debit once, even when combo contents change", async () => {
  let o = await save({
    lines: [{ item_type: "combo", combo_id: combo, quantity: 2, price: 25 }],
  });
  const before = await stock();
  await act(o, "confirm");
  assert.equal(await stock(), before - 4);
  await db.query("update combo_items set quantity=5 where combo_id=$1", [
    combo,
  ]);
  o = await fresh(o.id);
  await act(o, "cancel");
  assert.equal(await stock(), before);
  await act(o, "cancel");
  assert.equal(await stock(), before);
  o = await fresh(o.id);
  await act(o, "trash");
  assert.equal(await stock(), before);
  assert((await fresh(o.id)).deleted_at);
});
await test("exceptions roll back the complete order and audit, cross-tenant products and actors are rejected", async () => {
  const count = await scalar("select count(*)::int result from orders");
  await assert.rejects(
    save({
      lines: [
        ...items(),
        { item_type: "product", product_id: foreign, quantity: 1, price: 1 },
      ],
    }),
    /disponible/,
  );
  assert.equal(await scalar("select count(*)::int result from orders"), count);
  await assert.rejects(save({ actor: viewer }), /Sin permiso/);
  await assert.rejects(save({ actor: outsider }), /Sin permiso/);
  await assert.rejects(
    save({ fields: { ...payload, seller_key: `user:${outsider}` } }),
    /Responsable/,
  );
});
await test("audit insertion failure rolls stock and confirmation back together", async () => {
  const o = await save();
  const before = await stock();
  await db.exec(
    `create function private.test_audit_failure() returns trigger language plpgsql as $$begin raise exception 'test audit failure';end$$;create trigger test_failure before insert on inventory_movements for each row execute function private.test_audit_failure();`,
  );
  await assert.rejects(act(o, "confirm"), /test audit failure/);
  assert.equal(await stock(), before);
  assert.equal((await fresh(o.id)).lym_sale_state, "pending");
  assert.equal(
    await scalar(
      "select count(*)::int result from lym_order_stock where order_id=$1",
      [o.id],
    ),
    0,
  );
  await db.exec(
    "drop trigger test_failure on inventory_movements;drop function private.test_audit_failure();",
  );
});
await test("stock adjustment compares current stock and audits actor and reason atomically", async () => {
  const before = await stock();
  await db.query("select public.lym_adjust_stock($1,$2,$3,$4,$5,$6)", [
    store,
    staff,
    p1,
    before + 5,
    before,
    "Conteo físico",
  ]);
  assert.equal(await stock(), before + 5);
  await assert.rejects(
    db.query("select public.lym_adjust_stock($1,$2,$3,$4,$5,$6)", [
      store,
      staff,
      p1,
      0,
      before,
      "Conteo físico",
    ]),
    /cambiaron/,
  );
  assert.equal(
    await scalar(
      "select actor_id result from inventory_movements where reason='Conteo físico' order by created_at desc limit 1",
    ),
    staff,
  );
});
await test("legacy reconciliation never guesses stock or confirmation date and is owner-only", async () => {
  let o = await save();
  await db.query(
    "update orders set lym_sale_state='legacy',lym_origin='legacy' where id=$1",
    [o.id],
  );
  o = await fresh(o.id);
  const before = await stock();
  await assert.rejects(act(o, "confirm"), /conciliar/);
  await assert.rejects(act(o, "legacy_deducted"), /conciliar/);
  await act(o, "legacy_deducted", "Verificado contra registro anterior", owner);
  assert.equal(await stock(), before);
  o = await fresh(o.id);
  assert.equal(o.lym_confirmed_at, null);
  await act(o, "cancel");
  assert.equal(await stock(), before + 2);
});
await test("monthly totals use confirmation date, exclude reversals and pending, and include all sales people", async () => {
  let o = await save({
    fields: { ...payload, seller_key: `member:${member}` },
    lines: items(3, 9),
  });
  await act(o, "confirm");
  await db.query(
    "update orders set created_at='2025-01-02',lym_confirmed_at='2026-02-01 04:59:59+00' where id=$1",
    [o.id],
  );
  let report = await scalar(
    "select public.lym_monthly_report($1,$2,2026,1) result",
    [store, owner],
  );
  let row = report.rows.find((r) => r.seller_key === `member:${member}`);
  assert.equal(row.confirmed, 1);
  assert.equal(row.amount, 27);
  assert.equal(row.units, 3);
  const feb = await scalar(
    "select public.lym_monthly_report($1,$2,2026,2) result",
    [store, owner],
  );
  assert(!feb.rows.some((r) => r.confirmed > 0));
  o = await fresh(o.id);
  await act(o, "cancel");
  report = await scalar(
    "select public.lym_monthly_report($1,$2,2026,1) result",
    [store, owner],
  );
  assert(!report.rows.some((r) => r.confirmed > 0));
  await assert.rejects(
    scalar("select public.lym_monthly_report($1,$2,2026,1) result", [
      store,
      staff,
    ]),
    /jefa/,
  );
});
await test("database denies direct order mutations and service RPC calls to staff; scopes products to LYM", async () => {
  await db.exec(
    `select set_config('request.jwt.claim.sub','${staff}',false);set role authenticated;`,
  );
  try {
    assert.equal(
      await scalar("select public.has_store_access($1) result", [store]),
      false,
    );
    assert.equal(
      await scalar("select public.user_has_store_access($1) result", [store]),
      false,
    );

    assert.equal(
      await scalar(
        "select count(*)::int result from products where store_id=$1",
        [other],
      ),
      0,
    );
    assert.equal(await scalar("select count(*)::int result from combos"), 0);
    await assert.rejects(
      db.query("insert into orders(store_id,total,address) values($1,0,'x')", [
        store,
      ]),
      /panel|policy/,
    );
    await assert.rejects(
      db.query("select public.lym_order_action($1,$2,$3,'confirm',0,'')", [
        store,
        staff,
        crypto.randomUUID(),
      ]),
      /permission denied/,
    );
    await db.query("update products set price=12 where id=$1", [p1]);
    assert.equal(
      Number(
        await scalar("select price result from products where id=$1", [p1]),
      ),
      12,
    );
    await db.query("update store_users set role='OWNER' where user_id=$1", [
      staff,
    ]);
    assert.equal(
      await scalar("select role result from store_users where user_id=$1", [
        staff,
      ]),
      "LYM_SALES",
    );
  } finally {
    await db.exec("reset role;");
  }
  await assert.rejects(
    db.query(
      "insert into store_users(store_id,user_id,role) values($1,$2,'LYM_SALES')",
      [other, staff],
    ),
    /solo pertenece/,
  );
});
await test("other stores retain normal direct order behavior", async () => {
  await db.exec(
    `select set_config('request.jwt.claim.sub','${outsider}',false);set role authenticated;`,
  );
  try {
    await db.query(
      "insert into orders(store_id,total,address) values($1,5,'Otra dirección')",
      [other],
    );
  } finally {
    await db.exec("reset role;");
  }
});
await test("ShareAPP includes manually attributed confirmed sales and excludes their reversals", async () => {
  let o = await save({
    fields: { ...payload, seller_key: `member:${member}` },
    lines: items(2, 8),
  });
  await act(o, "confirm");
  let rows = (
    await db.query("select * from public.shareapp_results($1,$2)", [
      store,
      member,
    ])
  ).rows;
  assert.equal(Number(rows[0].paid_total), 16);
  assert.equal(Number(rows[0].paid_orders), 1);
  o = await fresh(o.id);
  await act(o, "cancel");
  rows = (
    await db.query("select * from public.shareapp_results($1,$2)", [
      store,
      member,
    ])
  ).rows;
  assert.equal(Number(rows[0].paid_total), 0);
});
await test("anonymous callers cannot append lines to a LYM request even without read access to orders", async () => {
  const o = await save();
  await db.exec(
    `create policy hide_orders_from_anon on orders as restrictive for select to anon using(false);set role anon;`,
  );
  try {
    assert.equal(await scalar("select count(*)::int result from orders"), 0);
    await assert.rejects(
      db.query(
        "insert into order_items(order_id,product_name,quantity,price) values($1,'Fake',1,0)",
        [o.id],
      ),
      /panel/,
    );
  } finally {
    await db.exec("reset role;");
  }
});
await test("competing pending orders cannot consume the last units twice", async () => {
  const before = await stock();
  await db.query("select public.lym_adjust_stock($1,$2,$3,1,$4,$5)", [
    store,
    staff,
    p1,
    before,
    "Última unidad de prueba",
  ]);
  const a = await save({ lines: items(1) }),
    b = await save({ lines: items(1) });
  const results = await Promise.all([act(a, "confirm"), act(b, "confirm")]);
  assert.equal(results.filter((r) => r.success).length, 1);
  assert.equal(results.filter((r) => r.code === "OUT_OF_STOCK").length, 1);
  assert.equal(await stock(), 0);
});
await db.close();
