import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, console: { warn() {}, error() {} }, ...globals, require(name) {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected import: ${name}`);
  } });
  return module.exports;
}

const pickup = { storeId: 'store-yoyo', storeName: 'YOYO', requestCode: 'REC-123', customerName: '<script>alert(1)</script>', phone: '+15555555555', address: 'Test address', dates: ['2099-12-20'], packageCount: 2, packageType: 'Cajas', estimatedWeight: null, needsBox: true, needsPackingHelp: false, notes: '<img onerror="bad">' };

function emailHarness({ recipient = 'yoyo@example.test', configured = true, reject = false } = {}) {
  const calls = [];
  const stores = [];
  const chain = { select() { return chain; }, eq(key, value) { stores.push([key, value]); return chain; }, async maybeSingle() { return { data: { order_notification_email: recipient }, error: null }; } };
  const { sendPickupNotification } = load('lib/notifications/pickup-notification.ts', { '@/lib/supabase-admin': { supabaseAdmin: { from: () => chain } } }, {
    process: { env: configured ? { RESEND_API_KEY: 'test', RESEND_FROM_EMAIL: 'notice@example.test' } : {} }, AbortSignal,
    fetch: async (url, options) => { calls.push({ url, ...options, body: JSON.parse(options.body) }); if (reject) throw new Error('Simulated outage'); return { ok: true }; },
  });
  return { send: () => sendPickupNotification(pickup), calls, stores };
}

test('email is store-scoped, escapes customer HTML and uses an idempotency key', async () => {
  const h = emailHarness();
  await h.send();
  assert.deepEqual(h.stores, [['store_id', 'store-yoyo']]);
  assert.deepEqual(h.calls[0].body.to, ['yoyo@example.test']);
  assert.equal(h.calls[0].headers['Idempotency-Key'], 'pickup-request/store-yoyo/REC-123');
  assert.ok(h.calls[0].body.html.includes('&lt;script&gt;'));
  assert.ok(!h.calls[0].body.html.includes('<script>'));
  assert.ok(h.calls[0].body.text.includes('20/12/2099'));
});

test('no configured recipient or provider causes no external send', async () => {
  for (const options of [{ recipient: '' }, { configured: false }]) {
    const h = emailHarness(options);
    await h.send();
    assert.equal(h.calls.length, 0);
  }
});

test('provider outage is absorbed so saved pickups remain successful', async () => {
  await assert.doesNotReject(emailHarness({ reject: true }).send);
});

function routeHarness(datesFail = false) {
  const scheduled = [];
  const notifications = [];
  const deletes = [];
  const db = { from(table) {
    const chain = {
      select() { return chain; }, eq() { return chain; },
      async maybeSingle() { return { data: table === 'stores' ? { id: 'store-yoyo', name: 'YOYO', slug: 'yoyo-envios' } : { max_preferred_dates: 3 }, error: null }; },
      insert() { return table === 'pickup_request_dates' ? Promise.resolve({ error: datesFail ? { message: 'date failure' } : null }) : chain; },
      async single() { return { data: { id: 'pickup', request_code: 'REC-123' }, error: null }; },
      delete() { deletes.push(table); return chain; },
    };
    return chain;
  } };
  const route = load('app/api/pickups/route.ts', {
    'next/server': { after: (work) => scheduled.push(work), NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    '@/lib/supabase-admin': { supabaseAdmin: db },
    '@/lib/notifications/pickup-notification': { sendPickupNotification: async (data) => notifications.push(data) },
    '@/lib/pickups/address-validation': { validatePickupAddress: async () => ({ valid: true, verified: true, formattedAddress: 'Validated address', latitude: null, longitude: null }) },
  });
  return { scheduled, notifications, deletes, post: () => route.POST({ headers: { get: () => 'application/json' }, json: async () => ({ store_slug: 'yoyo-envios', customer_name: 'Client', phone: '+15555555555', preferred_dates: ['2099-12-20'] }) }) };
}

test('successful pickup schedules exactly one notice after saving dates', async () => {
  const h = routeHarness();
  assert.equal((await h.post()).status, 201);
  assert.equal(h.scheduled.length, 1);
  assert.equal(h.notifications.length, 0);
  await h.scheduled[0]();
  assert.equal(h.notifications[0].requestCode, 'REC-123');
});

test('failed date save rolls back pickup and never schedules a notice', async () => {
  const h = routeHarness(true);
  assert.equal((await h.post()).status, 500);
  assert.equal(h.scheduled.length, 0);
  assert.deepEqual(h.deletes, ['pickup_requests']);
});
