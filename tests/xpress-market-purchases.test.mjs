import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");

test("Xpress market purchases preserve fees, inventory, eligibility, and refund history", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create schema private;
      create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      create table stores (id uuid primary key, slug text, is_active boolean default true);
      create table profiles (id uuid primary key, active boolean, role text);
      create table store_users (store_id uuid, user_id uuid, active boolean, role text);
      create table customers (id uuid primary key, store_id uuid, name text, phone text);
      create table products (
        id uuid primary key, store_id uuid, category text, weight numeric, weight_unit text, stock integer
      );
      create table orders (
        id uuid primary key, store_id uuid, order_number text, created_at timestamptz default now(),
        status text default 'pending', payment_status text default 'pending', payment_method text default 'whatsapp',
        customer_id uuid, customer_name text, customer_phone text, deleted_at timestamptz,
        source_shipment_id text, stock_restored boolean default false, notes text, subtotal numeric,
        total numeric, delivery_fee numeric, discount_amount numeric default 0,
        customer_management_fee numeric default 1.50, platform_fixed_fee_amount numeric default .50,
        platform_fee_amount numeric default .50, shipping_details jsonb
      );
      create table order_items (
        id uuid primary key, order_id uuid, product_id uuid, product_name text, item_type text default 'product',
        quantity integer, price numeric, subtotal numeric, platform_fee_amount numeric default 0
      );
      create table combo_items (combo_id uuid, product_id uuid, quantity integer);
      alter table order_items add column combo_id uuid;
      create table inventory_movements (
        product_id uuid, movement_type text, quantity integer, previous_stock integer,
        new_stock integer, notes text, store_id uuid, reason text, order_id uuid
      );
      create table shipping_rates (
        id uuid primary key, store_id uuid, rate_per_lb numeric, minimum_weight_lb numeric,
        minimum_charge numeric, fixed_fee numeric, weight_threshold_lb numeric, rate_at_or_above_threshold numeric
      );
    `);
    const stockMigration = await migration("20260913213102_log_automatic_inventory_sales.sql");
    await db.exec(stockMigration.slice(stockMigration.indexOf("create or replace function public.restore_product_inventory")));
    const ids = Object.fromEntries(["store", "user", "other", "apples", "bananas", "order", "second", "card", "applesLine", "bananasLine", "secondLine", "cardLine", "rate"].map((key, index) =>
      [key, `42000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`]
    ));
    const quote = { weight_lb: 13, amount: 61.87, shipping_rate_id: ids.rate };
    await db.exec(`
      insert into stores values ('${ids.store}', 'xpress'), ('${ids.other}', 'another-store');
      insert into profiles values ('${ids.user}', true, 'user');
      insert into store_users values ('${ids.store}', '${ids.user}', true, 'OWNER');
      insert into products values
        ('${ids.apples}', '${ids.store}', 'Frutas frescas', 4.5, 'lb', 96),
        ('${ids.bananas}', '${ids.store}', 'Frutas frescas', 4, 'lb', 99);
      insert into shipping_rates values ('${ids.rate}', '${ids.store}', 3.99, 0, 0, 10, null, null);
      insert into orders(id, store_id, order_number, subtotal, delivery_fee, total, shipping_details)
      values ('${ids.order}', '${ids.store}', 'XP-1', 24, 61.87, 87.37, '${JSON.stringify(quote)}'),
        ('${ids.second}', '${ids.store}', 'XP-2', 9, 27.96, 38.46, '${JSON.stringify({ ...quote, weight_lb: 4.5, amount: 27.96 })}'),
        ('${ids.card}', '${ids.store}', 'XP-3', 9, 27.96, 38.46, '${JSON.stringify({ ...quote, weight_lb: 4.5, amount: 27.96 })}');
      update orders set payment_status = 'paid', payment_method = 'card', total = 89.55 where id = '${ids.order}';
      update orders set payment_method = 'card' where id = '${ids.card}';
      insert into order_items(id, order_id, product_id, product_name, quantity, price, subtotal)
      values ('${ids.applesLine}', '${ids.order}', '${ids.apples}', 'Manzanas', 2, 9, 18),
        ('${ids.bananasLine}', '${ids.order}', '${ids.bananas}', 'Bananas', 1, 6, 6),
        ('${ids.secondLine}', '${ids.second}', '${ids.apples}', 'Manzanas', 1, 9, 9),
        ('${ids.cardLine}', '${ids.card}', '${ids.apples}', 'Manzanas', 1, 9, 9);
    `);
    await db.exec(await migration("20261127170000_xpress_market_purchases.sql"));

    async function call(sql, params) {
      return (await db.query(sql, params)).rows[0].result;
    }
    const list = (order = null) => call("select xpress_market_orders($1,$2) result", [ids.store, order]);
    const save = (order, revision, items, expected = null) => call(
      "select save_xpress_market_order($1,$2,$3,$4,$5,$6) result",
      [ids.store, order, revision, JSON.stringify(items), expected !== null, expected && JSON.stringify(expected)]
    );
    await db.exec("set role anon");
    await assert.rejects(list(), /permission denied/);
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${ids.user}'`);
    await assert.rejects(call("select xpress_market_orders($1) result", [ids.other]), /No tienes acceso/);

    assert.deepEqual((await list()).map((order) => order.number).sort(), ["XP-1", "XP-2"]);
    await assert.rejects(save(ids.card, 0, [{ id: ids.cardLine, quantity: 0, purchased: 0 }]), /Revisa su estado y el pago/);

    const adjustment = [
      { id: ids.applesLine, quantity: 1, purchased: 0 },
      { id: ids.bananasLine, quantity: 1, purchased: 1 },
    ];
    const preview = await save(ids.order, 0, adjustment);
    assert.equal(preview.weight_lb, 8.5);
    assert.equal(preview.delivery, 43.92);
    assert.equal(preview.management, 1.5);
    assert.equal(preview.after_total, 61.93);
    assert.equal(preview.refund_due, 27.62);
    assert.equal((await list(ids.order))[0].revision, 0);
    await assert.rejects(save(ids.order, 0, adjustment, { ...preview, after_total: 25 }), /Cambió el cálculo/);
    await save(ids.order, 0, adjustment, preview);
    await assert.rejects(save(ids.order, 0, adjustment, preview), /La orden cambió/);
    const [revised] = await list(ids.order);
    assert.equal(revised.items.find((line) => line.name === "Bananas").purchased, 1);
    assert.equal(revised.items.find((line) => line.name === "Manzanas").quantity, 1);
    assert.equal(revised.adjustments[0].refund_due, 27.62);
    const archive = (id) => call("select archive_xpress_market_order($1,$2) result", [ids.store, id]);
    await assert.rejects(archive(ids.order), /Registra el reembolso/);
    await db.query("select confirm_xpress_market_refund($1,$2)", [ids.store, revised.adjustments[0].id]);
    assert.ok((await list(ids.order))[0].adjustments[0].refunded_at);

    const purchased = [{ id: ids.applesLine, quantity: 1, purchased: 1 }];
    await save(ids.order, 1, purchased, await save(ids.order, 1, purchased));
    assert.deepEqual((await list()).map((order) => order.number), ["XP-2"]);
    const cancellation = [{ id: ids.secondLine, quantity: 0, purchased: 0 }];
    const cancelPreview = await save(ids.second, 0, cancellation);
    assert.equal(cancelPreview.cancelled, true);
    assert.equal(cancelPreview.after_total, 0);
    await save(ids.second, 0, cancellation, cancelPreview);
    assert.deepEqual(await list(), []);
    assert.equal((await list(ids.second))[0].status, "cancelled");

    assert.ok(await archive(ids.order));
    await assert.rejects(archive(ids.order), /ya no está disponible/);
    await db.exec("reset role");
    assert.equal(await call("select stock result from products where id = $1", [ids.apples]), 99);
    assert.equal(await call("select count(*)::integer result from inventory_movements", []), 4);
  } finally {
    await db.close();
  }
});
