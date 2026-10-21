import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real route with a fake database; never contact Stripe or production.
function harness(role = 'OWNER') {
  const current = { stripe_direct_secret_key: 'sk_live_existing', stripe_direct_webhook_secret: 'whsec_existing' };
  const writes = [];
  const db = {
    auth: { getUser: async () => ({ data: { user: { id: 'user' } } }) },
    from(table) {
      let update;
      const result = () => ({ data: table === 'profiles' ? { active: true, role: 'store_owner' } : table === 'store_users' ? { role } : current, error: null });
      const chain = {
        select: () => chain,
        eq: () => chain,
        update: (value) => { update = value; return chain; },
        maybeSingle: async () => result(),
        then(resolve) { if (update) { writes.push(update); Object.assign(current, update); } return Promise.resolve(result()).then(resolve); },
      };
      return chain;
    },
  };
  const routeModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('app/api/admin/shipping-settings/stripe-direct/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module: routeModule, exports: routeModule.exports, Set, require(name) {
    if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ status: options?.status || 200, body }) } };
    if (name === 'next/cache') return { revalidateTag() {} };
    if (name === '@/lib/supabase-admin') return { supabaseAdmin: db };
    throw new Error(name);
  } });
  return { current, writes, post: (body, authenticated = true) => routeModule.exports.POST({ headers: { get: () => authenticated ? 'Bearer test' : null }, json: async () => ({ store_id: 'store', ...body }) }) };
}

test('existing secret and restricted keys work in both environments', async () => {
  for (const prefix of ['sk_live_', 'rk_live_', 'sk_test_', 'rk_test_']) {
    const h = harness();
    assert.equal((await h.post({ secretKey: `${prefix}example123` })).status, 200);
    assert.equal(h.current.stripe_direct_webhook_secret, 'whsec_existing');
  }
});
test('editing either credential preserves the other when its input is empty', async () => {
  const h = harness();
  assert.equal((await h.post({ secretKey: 'rk_live_example123', webhookSecret: '' })).status, 200);
  assert.equal(h.current.stripe_direct_webhook_secret, 'whsec_existing');
  assert.equal((await h.post({ secretKey: '', webhookSecret: 'whsec_new' })).status, 200);
  assert.equal(h.current.stripe_direct_secret_key, 'rk_live_example123');
  assert.equal((await h.post({ mode: 'direct' })).status, 200);
  assert.equal(h.current.stripe_mode, 'direct');
});
test('public, malformed and empty keys cannot overwrite saved credentials', async () => {
  for (const key of ['pk_live_example', 'rk_live_', 'sk_random', 'rk_live_bad key']) {
    const h = harness();
    assert.equal((await h.post({ secretKey: key })).status, 400);
    assert.equal(h.writes.length, 0);
  }
  const h = harness();
  assert.equal((await h.post({ secretKey: '', webhookSecret: '' })).status, 400);
  assert.equal(h.writes.length, 0);
});
test('missing session and viewer cannot change payment credentials', async () => {
  const h = harness('VIEWER');
  assert.equal((await h.post({ secretKey: 'rk_live_example' })).status, 403);
  assert.equal((await h.post({ secretKey: 'rk_live_example' }, false)).status, 401);
  assert.equal(h.writes.length, 0);
});
