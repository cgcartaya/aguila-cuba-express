import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, require: name => {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  }});
  return module.exports;
}
const { saveCheckoutCustomer } = load('lib/checkout/customer.ts');
const db = new PGlite();
await db.exec(`
  create table customers (
    id integer generated always as identity primary key,
    store_id text not null, phone text not null, name text,
    email text, city text, device_token text,
    unique (store_id, phone)
  );
  create unique index customers_store_id_email_key
    on customers(store_id, lower(email)) where email is not null;
`);
const requests = [];
let forcedError = null;
// Use the real Supabase client to verify request bodies, conflict target and
// omitted-column behavior against Postgres's actual uniqueness constraints.
const client = createClient('https://checkout.test', 'test-key', { global: {
  fetch: async (url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    if (forcedError) return Response.json(forcedError, { status: 409 });
    assert.equal(new URL(url).searchParams.get('on_conflict'), 'store_id,phone');
    const keys = Object.keys(body);
    assert.ok(keys.every(key => ['store_id', 'phone', 'name', 'email', 'city', 'device_token'].includes(key)));
    try {
      const result = await db.query(`insert into customers (${keys.join(',')})
        values (${keys.map((_, i) => `$${i + 1}`).join(',')})
        on conflict (store_id, phone) do update set
        ${keys.map(key => `${key}=excluded.${key}`).join(',')}
        returning id`, keys.map(key => body[key]));
      return Response.json(result.rows[0]);
    } catch (error) {
      return Response.json({ code: error.code, message: error.message, details: null, hint: null }, { status: 409 });
    }
  },
}});
const customer = (changes = {}) => ({ store_id: 'store-a', phone: '111', name: 'Buyer A',
  email: 'shared@example.test', city: 'Miami', device_token: 'device-a', ...changes });
let ownerId;

test('normal checkout saves a customer and repeated phone keeps its ID', async () => {
  const first = await saveCheckoutCustomer(client, customer());
  assert.equal(first.error, null);
  ownerId = first.data.id;
  const repeated = await saveCheckoutCustomer(client, customer({ name: 'Updated buyer' }));
  assert.equal(repeated.error, null);
  assert.equal(repeated.data.id, ownerId);
});

test('new phone with same email in different case gets a separate ID without taking the existing history or device', async () => {
  const result = await saveCheckoutCustomer(client, customer({ phone: '222', email: 'SHARED@example.test', device_token: 'device-b' }));
  assert.equal(result.error, null);
  assert.notEqual(result.data.id, ownerId);
  const rows = (await db.query('select * from customers where store_id=$1 order by phone', ['store-a'])).rows;
  assert.equal(rows[0].email, 'shared@example.test');
  assert.equal(rows[0].device_token, 'device-a');
  assert.equal(rows[1].email, null);
  assert.equal(rows[1].device_token, 'device-b');
  assert.equal(Object.hasOwn(requests.at(-1), 'email'), false);
});

test('existing phone preserves its own email when another customer owns the submitted address', async () => {
  const first = await saveCheckoutCustomer(client, customer({ phone: '333', email: 'own@example.test', device_token: 'device-c' }));
  const result = await saveCheckoutCustomer(client, customer({ phone: '333', name: 'Updated C', device_token: 'device-c', email: 'SHARED@example.test' }));
  assert.equal(result.error, null);
  assert.equal(result.data.id, first.data.id);
  const row = (await db.query('select email,name from customers where id=$1', [result.data.id])).rows[0];
  assert.equal(row.email, 'own@example.test');
  assert.equal(row.name, 'Updated C');
});

test('the same email in another store remains valid and is not linked to store A', async () => {
  const result = await saveCheckoutCustomer(client, customer({ store_id: 'store-b', device_token: 'device-d' }));
  assert.equal(result.error, null);
  assert.notEqual(result.data.id, ownerId);
  assert.equal(requests.at(-1).email, 'shared@example.test');
});

test('checkout without email still saves its customer', async () => {
  const result = await saveCheckoutCustomer(client, customer({ phone: '444', email: null, device_token: 'device-e' }));
  assert.equal(result.error, null);
});

test('other database failures are returned without retrying or hiding them', async () => {
  for (const failure of [
    { code: '23505', message: 'duplicate key value violates unique constraint "customers_device_token_idx"' },
    { code: '08006', message: 'connection failure' },
  ]) {
    forcedError = failure;
    const before = requests.length;
    const result = await saveCheckoutCustomer(client, customer());
    assert.equal(result.error.code, failure.code);
    assert.equal(requests.length, before + 1);
  }
  forcedError = null;
});

test('retired elTOQUE cron has no service dependencies and reports disabled', async () => {
  const { GET } = load('app/api/cron/eltoque-rate/route.ts', { 'next/server': require('next/server') });
  const response = await GET();
  assert.equal(response.status, 410);
  assert.equal((await response.json()).enabled, false);
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.equal(config.crons.some(cron => cron.path === '/api/cron/eltoque-rate'), false);
  assert.equal(config.crons.length, 3);
});

test.after(async () => { await db.close(); });
