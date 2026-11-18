import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createHmac as hmac } from "node:crypto";
import { test } from "node:test";
import vm from "node:vm";
import { PGlite } from "@electric-sql/pglite";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const env = { SQUARE_TOKEN_ENCRYPTION_KEY: "ab".repeat(32) };
const loaded = { exports: {} };
vm.runInNewContext(ts.transpileModule(source("lib/payments/square.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: loaded, exports: loaded.exports, require, Buffer, process: { env } });
const { encryptSquareToken, decryptSquareToken, verifySquareSignature, createSquareState, hashSquareState } = loaded.exports;

test("Square tokens are authenticated against their tenant and purpose", () => {
  const value = "fake-square-token";
  const context = "store-1:sandbox:merchant:refresh";
  const encrypted = encryptSquareToken(value, context);
  assert.notEqual(encrypted, encryptSquareToken(value, context));
  assert.equal(decryptSquareToken(encrypted, context), value);
  assert.throws(() => decryptSquareToken(encrypted, context.replace("store-1", "store-2")));
  assert.throws(() => decryptSquareToken(encrypted, context.replace("refresh", "access")));
  const state = createSquareState();
  assert.match(state, /^[A-Za-z0-9_-]{43}$/);
  assert.match(hashSquareState(state), /^[a-f0-9]{64}$/);
});

test("Square HMAC binds both the registered URL and the raw body", () => {
  const body = '{"type":"payment.updated"}';
  const url = "https://example.test/api/webhooks/square";
  const key = "sandbox-key";
  const signature = hmac("sha256", key).update(url).update(body).digest("base64");
  assert.equal(verifySquareSignature(body, signature, url, key), true);
  assert.equal(verifySquareSignature(body + " ", signature, url, key), false);
  assert.equal(verifySquareSignature(body, signature, url + "/", key), false);
  assert.equal(verifySquareSignature(body, signature, url, "other-key"), false);
  assert.equal(verifySquareSignature(body, "invalid", url, key), false);
});

test("Square settlement is transactional, tenant-bound and idempotent", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create table stores(id uuid primary key);
      create table orders(id uuid primary key, store_id uuid, deleted_at timestamptz,
        payment_status text, payment_method text, status text, stock_restored boolean,
        source_shipment_id text, total numeric);
      create table inventory_movements(store_id uuid, order_id uuid, product_id uuid, movement_type text, quantity int, reason text);
      create table stock_restorations(needs jsonb);
      create function restore_product_inventory(uuid,jsonb) returns void language sql
        as 'insert into stock_restorations values ($2)';
    `);
    await db.exec(source("supabase/migrations/20261118110000_square_connections.sql"));
    await db.exec(source("supabase/migrations/20261118110100_square_store_checkout.sql"));
    await db.exec(`
      insert into stores(id) values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
      insert into store_square_settings(store_id, environment, merchant_id, location_id,
        access_token_encrypted, refresh_token_encrypted, token_expires_at)
        select id, 'sandbox', id::text, 'loc', 'encrypted-access', 'encrypted-refresh', now() from stores;
      insert into orders(id, store_id, total, payment_status, status, stock_restored, checkout_payment_provider) values
        ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 10, 'pending', 'pending', false, 'square'),
        ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 10, 'pending', 'pending', false, 'square'),
        ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 10, 'pending', 'pending', false, 'square');
      insert into square_payment_sessions(id, order_id, store_id, environment, merchant_id, location_id,
        amount_cents, item_name, return_url, square_order_id, status)
        select id, id, store_id, 'sandbox', store_id::text, 'loc', 1000, 'Test', 'https://example.test', id::text, 'pending' from orders;
    `);
    const ids = [11, 12, 13].map((n) => `00000000-0000-0000-0000-0000000000${n}`);
    const settle = async (id, event, payment, amount = 1000, type = "payment.updated") =>
      (await db.query("select settle_square_order($1,$2,$3,$4,'loc',$5,'USD') as status", [id, event, type, payment, amount])).rows[0].status;
    assert.equal(await settle(ids[0], "event-1", "payment-1"), "paid");
    assert.equal(await settle(ids[0], "event-1", "payment-1"), "paid");
    assert.equal(await settle(ids[1], "event-2", "payment-2", 900), "review");
    assert.equal(await settle(ids[0], "refund-1", "payment-1", 1000, "refund.updated"), "review");
    await db.query("select expire_square_order($1)", [ids[2]]);
    await db.query("select expire_square_order($1)", [ids[2]]);
    assert.equal(await settle(ids[2], "event-3", "late-payment"), "review");
    assert.deepEqual((await db.query("select payment_status from orders order by id")).rows.map((row) => row.payment_status),
      ["paid", "pending", "expired"]);
    assert.equal((await db.query("select count(*)::int as total from stock_restorations")).rows[0].total, 1);
    assert.equal((await db.query("select count(*)::int as total from square_payment_events")).rows[0].total, 4);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select * from store_square_settings"), /permission denied/);
  } finally {
    await db.close();
  }
});
