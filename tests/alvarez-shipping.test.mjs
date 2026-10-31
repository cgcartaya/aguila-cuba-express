import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function load(path, dependencies = {}) {
  const compiled = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module: compiled, exports: compiled.exports, require: name => dependencies[name], console });
  return compiled.exports;
}
const policy = load('lib/shipping/alvarez-policy.ts');
const weightRate = load('lib/shipping/weight-rate.ts');
function setup({ storeId = policy.ALVAREZ_STORE_ID, code = 'EXPRESS', province = 'La Habana' } = {}) {
  let saved;
  const tables = {
    stores: { id: storeId, name: 'Test agency' },
    customer_portal_settings: { pickup_mode: 'paid', pickup_fee: 20, insurance_mode: 'optional_fixed', insurance_value: 30 },
    shipping_service_types: { id: 'service', name: code, code },
    shipping_countries: { id: 'country', name: 'Cuba' },
    shipping_provinces: { id: 'province', name: province, country_id: 'country' },
    shipping_rates: [{ id: 'rate', scope_type: 'country', country_id: 'country', rate_per_lb: code === 'EXPRESS_ESSENTIALS' ? 5 : code === 'EXPRESS' ? 6 : 3, weight_threshold_lb: null, rate_at_or_above_threshold: null, minimum_weight_lb: 15, fixed_fee: 25, minimum_charge: 200, estimated_days_min: 9, estimated_days_max: 15 }],
  };
  const admin = { from(table) {
    const builder = {
      select() { return this; }, eq() { return this; },
      insert(payload) { saved = payload; return this; },
      maybeSingle() { return Promise.resolve({ data: tables[table], error: null }); },
      single() { return Promise.resolve({ data: { ...saved, public_code: 'TEST' }, error: null }); },
      then(resolve) { return Promise.resolve({ data: tables[table], error: null }).then(resolve); },
    };
    return builder;
  } };
  const { POST } = load('app/api/public/quote/route.ts', {
    '@/lib/shipping/alvarez-policy': policy,
    '@/lib/shipping/weight-rate': weightRate,
    '@/lib/supabase-admin': { supabaseAdmin: admin },
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
  });
  return { saved: () => saved, quote: (weight, extra = {}) => POST({ headers: new Map([['host', 'alvarez-travel.perlamarketplace.com']]), json: async () => ({ customer_name: 'Test', customer_phone: '3055550100', service_type_id: 'service', transport_mode: 'air', country_id: 'country', province_id: 'province', weight_lb: weight, pickup_requested: true, insurance_requested: true, ...extra }) }) };
}
for (const [code, province, minimum, daysMin, daysMax] of [
  ['EXPRESS', 'La Habana', 5, 1, 2], ['EXPRESS', 'Mayabeque', 10, 5, 6],
  ['EXPRESS_ESSENTIALS', 'La Habana', 5, 1, 2], ['EXPRESS_ESSENTIALS', 'Mayabeque', 10, 5, 6],
  ['REGULAR', 'La Habana', 10, 7, 12], ['REGULAR', 'Santiago de Cuba', 10, 7, 12],
]) {
  test(`${code} ${province}: minimum ${minimum}, free pickup, delivery ${daysMin}–${daysMax}`, async () => {
    const api = setup({ code, province });
    assert.equal((await api.quote(minimum - 0.1)).status, 422);
    assert.equal(api.saved(), undefined);
    const response = await api.quote(minimum);
    assert.equal(response.status, 200);
    assert.equal(response.body.billable_weight_lb, minimum);
    assert.equal(response.body.total_amount, minimum * (code === 'EXPRESS_ESSENTIALS' ? 5 : code === 'EXPRESS' ? 6 : 3));
    assert.equal(response.body.pickup_amount, 0);
    assert.equal(response.body.insurance_amount, 0);
    assert.equal(api.saved().estimated_days_min, daysMin);
    assert.equal(api.saved().estimated_days_max, daysMax);
    assert.match(response.body.delivery_label, /desde la salida/);
  });
}
test('Express uses the category rate at and above 20 lb', async () => {
  const api = setup();
  assert.equal((await api.quote(19.9)).body.total_amount, 19.9 * 6);
  const atThreshold = (await api.quote(20)).body;
  assert.equal(atThreshold.total_amount, 120);
  assert.equal(atThreshold.applied_rate, 6);
  assert.equal((await api.quote(25)).body.total_amount, 150);
  assert.equal((await setup({ code: 'EXPRESS_ESSENTIALS' }).quote(20)).body.total_amount, 100);
  assert.equal((await setup({ code: 'REGULAR' }).quote(20)).body.total_amount, 60);
});
test('Alvarez requires a province and a finite positive weight', async () => {
  const api = setup();
  assert.equal((await api.quote(5, { province_id: '' })).status, 422);
  for (const weight of [0, -1, NaN, Infinity]) assert.equal((await api.quote(weight)).status, 400);
});
test('other agencies retain their configured minimum charges and extra fees', async () => {
  const api = setup({ storeId: 'other-agency' });
  const result = await api.quote(5);
  assert.equal(result.status, 200);
  assert.equal(result.body.billable_weight_lb, 15);
  assert.equal(result.body.total_amount, 250);
  assert.equal(result.body.pickup_amount, 20);
  assert.equal(result.body.insurance_amount, 30);
  assert.equal(api.saved().estimated_days_min, 9);
});

test('Alvarez persists the category from the selected service, not the submitted label', async () => {
  const api = setup({ code: 'EXPRESS_ESSENTIALS' });
  const response = await api.quote(5, { item_category: 'miscelaneas' });
  assert.equal(response.body.total_amount, 25);
  assert.equal(api.saved().item_category, 'comida_medicinas_aseo');
});
